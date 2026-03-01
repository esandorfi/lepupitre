use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(super) struct PackManifestV1 {
    pub(super) schema_version: String,
    pub(super) pack_id: String,
    pub(super) created_at: String,
    pub(super) app_version: String,
    pub(super) profile_id: Option<String>,
    pub(super) project_id: String,
    pub(super) run: PackRun,
    pub(super) files: Vec<PackFileEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(super) struct PackRun {
    pub(super) run_id: String,
    pub(super) duration_ms: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub(super) struct PackFileEntry {
    pub(super) path: String,
    pub(super) role: String,
    pub(super) sha256: String,
    pub(super) bytes: u64,
    pub(super) mime: String,
}
