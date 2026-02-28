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
    insert_artifact_row_with_cleanup(
        &conn,
        ArtifactInsertRow {
            artifact_id: &artifact_id,
            artifact_type,
            relpath: &relpath,
            sha256: &sha256,
            byte_len: byte_len as i64,
            created_at: &created_at,
            metadata_json: &metadata_json,
        },
        &abspath,
    )?;

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
    insert_artifact_row_with_cleanup(
        &conn,
        ArtifactInsertRow {
            artifact_id: &draft.id,
            artifact_type: &draft.artifact_type,
            relpath: &draft.relpath,
            sha256: &sha256,
            byte_len: byte_len as i64,
            created_at: &created_at,
            metadata_json: &metadata_json,
        },
        &draft.abspath,
    )?;

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
    delete_artifacts_with_conn(&conn, &profile_dir, &[artifact_id])
}

pub fn delete_artifacts(
    app: &tauri::AppHandle,
    profile_id: &str,
    artifact_ids: &[&str],
) -> Result<(), String> {
    let conn = db::open_profile(app, profile_id)?;
    let profile_dir = db::profile_dir(app, profile_id)?;
    delete_artifacts_with_conn(&conn, &profile_dir, artifact_ids)
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

fn delete_artifacts_with_conn(
    conn: &Connection,
    profile_dir: &Path,
    artifact_ids: &[&str],
) -> Result<(), String> {
    let mut errors = Vec::new();
    for artifact_id in artifact_ids {
        if let Err(err) = delete_artifact_with_conn(conn, profile_dir, artifact_id) {
            errors.push(format!("{artifact_id}: {err}"));
        }
    }
    if errors.is_empty() {
        Ok(())
    } else {
        Err(format!(
            "artifact_batch_delete_failed: {}",
            errors.join("; ")
        ))
    }
}

struct ArtifactInsertRow<'a> {
    artifact_id: &'a str,
    artifact_type: &'a str,
    relpath: &'a str,
    sha256: &'a str,
    byte_len: i64,
    created_at: &'a str,
    metadata_json: &'a str,
}

fn insert_artifact_row_with_cleanup(
    conn: &Connection,
    row: ArtifactInsertRow<'_>,
    cleanup_path: &Path,
) -> Result<(), String> {
    let insert_result = conn.execute(
        "INSERT INTO artifacts (id, type, local_relpath, sha256, bytes, created_at, metadata_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            row.artifact_id,
            row.artifact_type,
            row.relpath,
            row.sha256,
            row.byte_len,
            row.created_at,
            row.metadata_json
        ],
    );
    if let Err(err) = insert_result {
        let persist_err = format!("artifact_insert: {err}");
        match remove_file_if_exists(cleanup_path) {
            Ok(()) => Err(persist_err),
            Err(cleanup_err) => Err(format!("{persist_err}; {cleanup_err}")),
        }
    } else {
        Ok(())
    }
}

fn remove_file_if_exists(path: &Path) -> Result<(), String> {
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| format!("artifact_cleanup_file: {e}"))?;
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
    use super::{
        delete_artifact_with_conn, delete_artifacts_with_conn, insert_artifact_row_with_cleanup,
        ArtifactInsertRow,
    };
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

    #[test]
    fn delete_artifacts_with_conn_removes_multiple_rows_and_files() {
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
        let profile_dir = std::env::temp_dir().join(format!("lepupitre-artifacts-batch-{nonce}"));
        let path_a = profile_dir
            .join("artifacts")
            .join("feedback")
            .join("art_a.json");
        let path_b = profile_dir
            .join("artifacts")
            .join("feedback")
            .join("art_b.json");
        std::fs::create_dir_all(path_a.parent().expect("parent a")).expect("mkdir a");
        std::fs::write(&path_a, b"a").expect("write a");
        std::fs::write(&path_b, b"b").expect("write b");

        conn.execute(
            "INSERT INTO artifacts (id, type, local_relpath, sha256, bytes, created_at, metadata_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                "art_a",
                "feedback",
                "artifacts/feedback/art_a.json",
                "sha_a",
                1i64,
                "2026-02-28T00:00:00Z",
                "{}"
            ],
        )
        .expect("insert a");
        conn.execute(
            "INSERT INTO artifacts (id, type, local_relpath, sha256, bytes, created_at, metadata_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                "art_b",
                "feedback",
                "artifacts/feedback/art_b.json",
                "sha_b",
                1i64,
                "2026-02-28T00:00:00Z",
                "{}"
            ],
        )
        .expect("insert b");

        delete_artifacts_with_conn(&conn, &profile_dir, &["art_a", "art_b", "missing"])
            .expect("batch delete");

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM artifacts", [], |row| row.get(0))
            .expect("count");
        assert_eq!(count, 0);
        assert!(!path_a.exists());
        assert!(!path_b.exists());

        let _ = std::fs::remove_dir_all(profile_dir);
    }

    #[test]
    fn insert_artifact_row_with_cleanup_removes_file_on_insert_failure() {
        let conn = Connection::open_in_memory().expect("open");
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let file_path =
            std::env::temp_dir().join(format!("lepupitre-artifact-insert-fail-{nonce}.json"));
        std::fs::write(&file_path, b"{}").expect("write");
        assert!(file_path.exists());

        let err = insert_artifact_row_with_cleanup(
            &conn,
            ArtifactInsertRow {
                artifact_id: "art_1",
                artifact_type: "feedback",
                relpath: "artifacts/feedback/art_1.json",
                sha256: "abc",
                byte_len: 2,
                created_at: "2026-02-28T00:00:00Z",
                metadata_json: "{}",
            },
            &file_path,
        )
        .expect_err("insert should fail because artifacts table is missing");
        assert!(err.contains("artifact_insert:"));
        assert!(!file_path.exists());
    }

    #[test]
    fn insert_artifact_row_with_cleanup_reports_cleanup_error() {
        let conn = Connection::open_in_memory().expect("open");
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time")
            .as_nanos();
        let dir_path = std::env::temp_dir().join(format!("lepupitre-artifact-cleanup-dir-{nonce}"));
        std::fs::create_dir_all(&dir_path).expect("mkdir");
        assert!(dir_path.is_dir());

        let err = insert_artifact_row_with_cleanup(
            &conn,
            ArtifactInsertRow {
                artifact_id: "art_2",
                artifact_type: "feedback",
                relpath: "artifacts/feedback/art_2.json",
                sha256: "def",
                byte_len: 2,
                created_at: "2026-02-28T00:00:00Z",
                metadata_json: "{}",
            },
            &dir_path,
        )
        .expect_err("insert should fail and cleanup should fail on directory path");
        assert!(err.contains("artifact_insert:"));
        assert!(err.contains("artifact_cleanup_file:"));

        let _ = std::fs::remove_dir_all(dir_path);
    }
}
