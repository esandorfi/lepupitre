mod queries;
mod repo;

use crate::kernel::models;
use crate::platform::artifacts;
use crate::platform::db;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PeerReviewSummary {
    pub id: String,
    pub run_id: String,
    pub project_id: String,
    pub created_at: String,
    pub reviewer_tag: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PeerReviewDetail {
    pub id: String,
    pub run_id: String,
    pub project_id: String,
    pub created_at: String,
    pub reviewer_tag: Option<String>,
    pub review: models::PeerReviewV1,
}

pub fn peer_review_list(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    limit: Option<i64>,
) -> Result<Vec<PeerReviewSummary>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let normalized_limit = repo::normalize_peer_review_limit(limit);
    repo::list_peer_reviews(&conn, &project_id, normalized_limit)
}

pub fn peer_review_get(
    app: tauri::AppHandle,
    profile_id: String,
    peer_review_id: String,
) -> Result<PeerReviewDetail, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let detail_row = repo::fetch_peer_review_detail_row(&conn, &peer_review_id)?;

    let artifact = artifacts::get_artifact(&app, &profile_id, &detail_row.artifact_id)?;
    if artifact.artifact_type != "peer_review" {
        return Err("peer_review_artifact_type".to_string());
    }
    let review_path =
        artifacts::resolve_profile_relpath_for_read(&app, &profile_id, &artifact.relpath)?;
    let bytes = std::fs::read(&review_path).map_err(|e| format!("peer_review_read: {e}"))?;
    let review: models::PeerReviewV1 =
        serde_json::from_slice(&bytes).map_err(|e| format!("peer_review_parse: {e}"))?;

    Ok(PeerReviewDetail {
        id: peer_review_id,
        run_id: detail_row.run_id,
        project_id: detail_row.project_id,
        created_at: detail_row.created_at,
        reviewer_tag: detail_row.reviewer_tag,
        review,
    })
}

#[cfg(test)]
mod tests {
    use super::repo::normalize_peer_review_limit;

    #[test]
    fn peer_review_limit_is_bounded() {
        assert_eq!(normalize_peer_review_limit(None), 12);
        assert_eq!(normalize_peer_review_limit(Some(-7)), 1);
        assert_eq!(normalize_peer_review_limit(Some(9)), 9);
        assert_eq!(normalize_peer_review_limit(Some(9999)), 100);
    }
}
