use super::queries;
use super::PeerReviewSummary;
use rusqlite::params;

pub(super) struct PeerReviewDetailRow {
    pub(super) run_id: String,
    pub(super) project_id: String,
    pub(super) created_at: String,
    pub(super) reviewer_tag: Option<String>,
    pub(super) artifact_id: String,
}

pub(super) fn list_peer_reviews(
    conn: &rusqlite::Connection,
    project_id: &str,
    limit: i64,
) -> Result<Vec<PeerReviewSummary>, String> {
    let mut stmt = conn
        .prepare(queries::LIST_PEER_REVIEWS_BY_PROJECT)
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

pub(super) fn fetch_peer_review_detail_row(
    conn: &rusqlite::Connection,
    peer_review_id: &str,
) -> Result<PeerReviewDetailRow, String> {
    conn.query_row(
        queries::SELECT_PEER_REVIEW_DETAIL_ROW,
        params![peer_review_id],
        |row| {
            Ok(PeerReviewDetailRow {
                run_id: row.get(0)?,
                project_id: row.get(1)?,
                created_at: row.get(2)?,
                reviewer_tag: row.get(3)?,
                artifact_id: row.get(4)?,
            })
        },
    )
    .map_err(|e| format!("peer_review_lookup: {e}"))
}

pub(super) fn normalize_peer_review_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(12).clamp(1, 100)
}
