use crate::core::{artifacts, db, models};
use rusqlite::params;
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

#[tauri::command]
pub fn peer_review_list(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    limit: Option<i64>,
) -> Result<Vec<PeerReviewSummary>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let limit = limit.unwrap_or(12).max(1);

    let mut stmt = conn
        .prepare(
            "SELECT pr.id, pr.run_id, r.project_id, pr.created_at, pr.reviewer_tag
             FROM peer_reviews pr
             JOIN runs r ON r.id = pr.run_id
             WHERE r.project_id = ?1
             ORDER BY pr.created_at DESC
             LIMIT ?2",
        )
        .map_err(|e| format!("peer_review_list_prepare: {e}"))?;

    let rows = stmt
        .query_map(params![project_id, limit], |row| {
            Ok(PeerReviewSummary {
                id: row.get(0)?,
                run_id: row.get(1)?,
                project_id: row.get(2)?,
                created_at: row.get(3)?,
                reviewer_tag: row.get(4)?,
            })
        })
        .map_err(|e| format!("peer_review_list_query: {e}"))?;

    let mut reviews = Vec::new();
    for row in rows {
        reviews.push(row.map_err(|e| format!("peer_review_list_row: {e}"))?);
    }

    Ok(reviews)
}

#[tauri::command]
pub fn peer_review_get(
    app: tauri::AppHandle,
    profile_id: String,
    peer_review_id: String,
) -> Result<PeerReviewDetail, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let (run_id, project_id, created_at, reviewer_tag, artifact_id): (
        String,
        String,
        String,
        Option<String>,
        String,
    ) = conn
        .query_row(
            "SELECT pr.run_id, r.project_id, pr.created_at, pr.reviewer_tag, pr.review_json_artifact_id
             FROM peer_reviews pr
             JOIN runs r ON r.id = pr.run_id
             WHERE pr.id = ?1",
            params![peer_review_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .map_err(|e| format!("peer_review_lookup: {e}"))?;

    let artifact = artifacts::get_artifact(&app, &profile_id, &artifact_id)?;
    if artifact.artifact_type != "peer_review" {
        return Err("peer_review_artifact_type".to_string());
    }
    let profile_dir = db::profile_dir(&app, &profile_id)?;
    let review_path = profile_dir.join(&artifact.relpath);
    let bytes = std::fs::read(&review_path).map_err(|e| format!("peer_review_read: {e}"))?;
    let review: models::PeerReviewV1 =
        serde_json::from_slice(&bytes).map_err(|e| format!("peer_review_parse: {e}"))?;

    Ok(PeerReviewDetail {
        id: peer_review_id,
        run_id,
        project_id,
        created_at,
        reviewer_tag,
        review,
    })
}
