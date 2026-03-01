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
    let limit = normalize_run_list_limit(limit);
    repo::select_runs(&conn, project_id, limit)
}

pub(super) fn normalize_run_list_limit(limit: Option<u32>) -> i64 {
    limit.unwrap_or(12).clamp(1, 100) as i64
}

#[cfg(test)]
mod tests {
    use super::normalize_run_list_limit;

    #[test]
    fn run_list_limit_is_bounded() {
        assert_eq!(normalize_run_list_limit(None), 12);
        assert_eq!(normalize_run_list_limit(Some(0)), 1);
        assert_eq!(normalize_run_list_limit(Some(8)), 8);
        assert_eq!(normalize_run_list_limit(Some(5000)), 100);
    }
}
