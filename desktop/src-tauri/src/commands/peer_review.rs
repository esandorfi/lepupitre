use crate::core::peer_review as peer_review_core;

pub use peer_review_core::{PeerReviewDetail, PeerReviewSummary};

#[tauri::command]
pub fn peer_review_list(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    limit: Option<i64>,
) -> Result<Vec<PeerReviewSummary>, String> {
    peer_review_core::peer_review_list(app, profile_id, project_id, limit)
}

#[tauri::command]
pub fn peer_review_get(
    app: tauri::AppHandle,
    profile_id: String,
    peer_review_id: String,
) -> Result<PeerReviewDetail, String> {
    peer_review_core::peer_review_get(app, profile_id, peer_review_id)
}
