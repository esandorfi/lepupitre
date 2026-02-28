use crate::core::{db, ids, time};
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::io::Read;
use std::path::{Path, PathBuf};

pub struct ArtifactRecord {
    pub id: String,
    pub abspath: PathBuf,
    pub bytes: u64,
    pub sha256: String,
}

pub struct ArtifactInfo {
    pub artifact_type: String,
    pub relpath: String,
}

pub struct ArtifactDraft {
    pub id: String,
    pub artifact_type: String,
    pub relpath: String,
    pub abspath: PathBuf,
}

pub fn get_artifact(
    app: &tauri::AppHandle,
    profile_id: &str,
    artifact_id: &str,
) -> Result<ArtifactInfo, String> {
    let conn = db::open_profile(app, profile_id)?;
    let row = conn
        .query_row(
            "SELECT type, local_relpath FROM artifacts WHERE id = ?1",
            [artifact_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .map_err(|e| format!("artifact_lookup: {e}"))?;
    Ok(ArtifactInfo {
        artifact_type: row.0,
        relpath: row.1,
    })
}

pub fn store_bytes(
    app: &tauri::AppHandle,
    profile_id: &str,
    artifact_type: &str,
    extension: &str,
    bytes: &[u8],
    metadata: &Value,
) -> Result<ArtifactRecord, String> {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let sha256 = to_hex(&hasher.finalize());
    let byte_len = bytes.len() as u64;

    let artifact_id = ids::new_id("art");
    let relpath = format!("artifacts/{artifact_type}/{artifact_id}.{extension}");
    let profile_dir = db::profile_dir(app, profile_id)?;
    let abspath = profile_dir.join(&relpath);

    if let Some(parent) = abspath.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("artifact_dir: {e}"))?;
    }
    std::fs::write(&abspath, bytes).map_err(|e| format!("artifact_write: {e}"))?;

    let created_at = time::now_rfc3339();
    let metadata_json =
        serde_json::to_string(metadata).map_err(|e| format!("artifact_metadata: {e}"))?;
    let conn = db::open_profile(app, profile_id)?;
    conn.execute(
        "INSERT INTO artifacts (id, type, local_relpath, sha256, bytes, created_at, metadata_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            artifact_id,
            artifact_type,
            relpath,
            sha256,
            byte_len as i64,
            created_at,
            metadata_json
        ],
    )
    .map_err(|e| format!("artifact_insert: {e}"))?;

    Ok(ArtifactRecord {
        id: artifact_id,
        abspath,
        bytes: byte_len,
        sha256,
    })
}

pub fn create_draft(
    app: &tauri::AppHandle,
    profile_id: &str,
    artifact_type: &str,
    extension: &str,
) -> Result<ArtifactDraft, String> {
    let artifact_id = ids::new_id("art");
    let relpath = format!("artifacts/{artifact_type}/{artifact_id}.{extension}");
    let profile_dir = db::profile_dir(app, profile_id)?;
    let abspath = profile_dir.join(&relpath);

    if let Some(parent) = abspath.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("artifact_dir: {e}"))?;
    }

    Ok(ArtifactDraft {
        id: artifact_id,
        artifact_type: artifact_type.to_string(),
        relpath,
        abspath,
    })
}

pub fn finalize_draft(
    app: &tauri::AppHandle,
    profile_id: &str,
    draft: ArtifactDraft,
    metadata: &Value,
) -> Result<ArtifactRecord, String> {
    let (sha256, byte_len) = sha256_file(&draft.abspath)?;
    let created_at = time::now_rfc3339();
    let metadata_json =
        serde_json::to_string(metadata).map_err(|e| format!("artifact_metadata: {e}"))?;
    let conn = db::open_profile(app, profile_id)?;
    conn.execute(
        "INSERT INTO artifacts (id, type, local_relpath, sha256, bytes, created_at, metadata_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            draft.id,
            draft.artifact_type,
            draft.relpath,
            sha256,
            byte_len as i64,
            created_at,
            metadata_json
        ],
    )
    .map_err(|e| format!("artifact_insert: {e}"))?;

    Ok(ArtifactRecord {
        id: draft.id,
        abspath: draft.abspath,
        bytes: byte_len,
        sha256,
    })
}

pub fn delete_artifact(
    app: &tauri::AppHandle,
    profile_id: &str,
    artifact_id: &str,
) -> Result<(), String> {
    let conn = db::open_profile(app, profile_id)?;
    let profile_dir = db::profile_dir(app, profile_id)?;
    delete_artifact_with_conn(&conn, &profile_dir, artifact_id)
}

fn delete_artifact_with_conn(
    conn: &Connection,
    profile_dir: &Path,
    artifact_id: &str,
) -> Result<(), String> {
    let relpath: Option<String> = conn
        .query_row(
            "SELECT local_relpath FROM artifacts WHERE id = ?1",
            [artifact_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("artifact_delete_lookup: {e}"))?;
    let Some(relpath) = relpath else {
        return Ok(());
    };

    conn.execute("DELETE FROM artifacts WHERE id = ?1", [artifact_id])
        .map_err(|e| format!("artifact_delete_row: {e}"))?;

    let abspath = profile_dir.join(relpath);
    if abspath.exists() {
        std::fs::remove_file(&abspath).map_err(|e| format!("artifact_delete_file: {e}"))?;
    }

    Ok(())
}

fn sha256_file(path: &PathBuf) -> Result<(String, u64), String> {
    let mut file = std::fs::File::open(path).map_err(|e| format!("artifact_open: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    let mut total = 0u64;

    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|e| format!("artifact_read: {e}"))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
        total += read as u64;
    }

    Ok((to_hex(&hasher.finalize()), total))
}

fn to_hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::delete_artifact_with_conn;
    use rusqlite::{params, Connection};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn delete_artifact_with_conn_removes_row_and_file() {
        let conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "CREATE TABLE artifacts (
               id TEXT PRIMARY KEY,
               type TEXT NOT NULL,
               local_relpath TEXT NOT NULL,
               sha256 TEXT NOT NULL,
               bytes INTEGER NOT NULL,
               created_at TEXT NOT NULL,
               metadata_json TEXT NOT NULL
             );",
        )
        .expect("schema");

        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let profile_dir = std::env::temp_dir().join(format!("lepupitre-artifacts-delete-{nonce}"));
        let artifact_path = profile_dir
            .join("artifacts")
            .join("feedback")
            .join("art_1.json");
        std::fs::create_dir_all(artifact_path.parent().expect("parent")).expect("mkdir");
        std::fs::write(&artifact_path, b"{}").expect("write");

        conn.execute(
            "INSERT INTO artifacts (id, type, local_relpath, sha256, bytes, created_at, metadata_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                "art_1",
                "feedback",
                "artifacts/feedback/art_1.json",
                "abc",
                2i64,
                "2026-02-28T00:00:00Z",
                "{}"
            ],
        )
        .expect("insert");

        delete_artifact_with_conn(&conn, &profile_dir, "art_1").expect("delete");

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM artifacts WHERE id = 'art_1'",
                [],
                |row| row.get(0),
            )
            .expect("count");
        assert_eq!(count, 0);
        assert!(!artifact_path.exists());

        let _ = std::fs::remove_dir_all(profile_dir);
    }

    #[test]
    fn delete_artifact_with_conn_is_idempotent_for_missing_row() {
        let conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "CREATE TABLE artifacts (
               id TEXT PRIMARY KEY,
               type TEXT NOT NULL,
               local_relpath TEXT NOT NULL,
               sha256 TEXT NOT NULL,
               bytes INTEGER NOT NULL,
               created_at TEXT NOT NULL,
               metadata_json TEXT NOT NULL
             );",
        )
        .expect("schema");
        let profile_dir = std::env::temp_dir().join("lepupitre-artifacts-delete-missing");
        std::fs::create_dir_all(&profile_dir).expect("mkdir");

        delete_artifact_with_conn(&conn, &profile_dir, "missing").expect("idempotent");
        let _ = std::fs::remove_dir_all(profile_dir);
    }
}
