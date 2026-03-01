use super::repo;
use super::types::FeedbackTimelineItem;
use crate::platform::db;

pub fn feedback_timeline_list(
    app: &tauri::AppHandle,
    profile_id: &str,
    project_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<FeedbackTimelineItem>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let limit = normalize_timeline_limit(limit);

    if let Some(project_id) = project_id.as_ref() {
        repo::ensure_project_exists(&conn, project_id)?;
    }

    repo::select_feedback_timeline(&conn, project_id.as_deref(), limit)
}

pub(super) fn normalize_timeline_limit(limit: Option<u32>) -> i64 {
    let raw = limit.unwrap_or(30).max(1);
    raw.min(100) as i64
}
