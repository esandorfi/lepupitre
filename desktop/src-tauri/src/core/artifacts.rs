use crate::core::{db, ids, time};
use rusqlite::params;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::path::PathBuf;

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

fn to_hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}
