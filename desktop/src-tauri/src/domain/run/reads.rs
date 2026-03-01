use super::repo;
use super::types::RunSummary;
use crate::platform::db;
use tauri::AppHandle;

pub fn run_get_latest(
    app: &AppHandle,
    profile_id: &str,
    project_id: &str,
) -> Result<Option<RunSummary>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::select_latest_run(&conn, project_id)
}

pub fn run_get(
    app: &AppHandle,
    profile_id: &str,
    run_id: &str,
) -> Result<Option<RunSummary>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::select_run(&conn, run_id)
}

pub fn run_list(
    app: &AppHandle,
    profile_id: &str,
    project_id: &str,
    limit: Option<u32>,
) -> Result<Vec<RunSummary>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let limit = limit.unwrap_or(12).max(1) as i64;
    repo::select_runs(&conn, project_id, limit)
}
