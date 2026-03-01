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
    let limit = normalize_attempts_limit(limit);
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

fn normalize_attempts_limit(limit: Option<u32>) -> i64 {
    limit.unwrap_or(6).clamp(1, 100) as i64
}

#[cfg(test)]
mod tests {
    use super::normalize_attempts_limit;

    #[test]
    fn attempts_limit_is_bounded() {
        assert_eq!(normalize_attempts_limit(None), 6);
        assert_eq!(normalize_attempts_limit(Some(0)), 1);
        assert_eq!(normalize_attempts_limit(Some(10)), 10);
        assert_eq!(normalize_attempts_limit(Some(10_000)), 100);
    }
}
