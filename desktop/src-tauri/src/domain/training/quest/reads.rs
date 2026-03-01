use super::repo;
use super::types::{QuestAttemptSummary, QuestReportItem};
use crate::kernel::models::{Quest, QuestDaily};
use crate::platform::db;

pub fn quest_get_daily(
    app: &tauri::AppHandle,
    profile_id: &str,
    project_id: &str,
) -> Result<QuestDaily, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;

    let quest = repo::select_first_quest(&conn)?;
    let why = format!("Project {} is in draft", project_id);

    Ok(QuestDaily {
        quest,
        why,
        due_boss_run: false,
    })
}

pub fn quest_get_by_code(
    app: &tauri::AppHandle,
    profile_id: &str,
    quest_code: &str,
) -> Result<Quest, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::select_quest_by_code(&conn, quest_code)
}

pub fn quest_list(app: &tauri::AppHandle, profile_id: &str) -> Result<Vec<Quest>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::select_quest_list(&conn)
}

pub fn quest_attempts_list(
    app: &tauri::AppHandle,
    profile_id: &str,
    project_id: &str,
    limit: Option<u32>,
) -> Result<Vec<QuestAttemptSummary>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let limit = limit.unwrap_or(6).max(1) as i64;
    repo::select_attempt_summaries(&conn, project_id, limit)
}

pub fn quest_report(
    app: &tauri::AppHandle,
    profile_id: &str,
    project_id: &str,
) -> Result<Vec<QuestReportItem>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::select_report(&conn, project_id)
}
