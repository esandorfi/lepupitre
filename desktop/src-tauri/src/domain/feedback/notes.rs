use super::repo;
use crate::kernel::time;
use crate::platform::db;

pub fn feedback_note_get(
    app: &tauri::AppHandle,
    profile_id: &str,
    feedback_id: &str,
) -> Result<Option<String>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::select_feedback_note(&conn, feedback_id)
}

pub fn feedback_note_set(
    app: &tauri::AppHandle,
    profile_id: &str,
    feedback_id: &str,
    note: &str,
) -> Result<(), String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;

    if !repo::feedback_exists(&conn, feedback_id)? {
        return Err("feedback_not_found".to_string());
    }

    let trimmed = note.trim();
    if trimmed.is_empty() {
        repo::delete_feedback_note(&conn, feedback_id)?;
        return Ok(());
    }

    let now = time::now_rfc3339();
    repo::upsert_feedback_note(&conn, feedback_id, trimmed, &now)?;
    Ok(())
}
