use crate::core::{models, pack as pack_core};

pub use pack_core::{PackInspectResponse, PeerReviewImportResponse};

#[tauri::command]
pub fn pack_export(
    app: tauri::AppHandle,
    profile_id: String,
    run_id: String,
) -> Result<models::ExportResult, String> {
    pack_core::pack_export(app, profile_id, run_id)
}

#[tauri::command]
pub fn pack_inspect(
    app: tauri::AppHandle,
    profile_id: String,
    path: String,
) -> Result<PackInspectResponse, String> {
    pack_core::pack_inspect(app, profile_id, path)
}

#[tauri::command]
pub fn peer_review_import(
    app: tauri::AppHandle,
    profile_id: String,
    path: String,
) -> Result<PeerReviewImportResponse, String> {
    pack_core::peer_review_import(app, profile_id, path)
}
