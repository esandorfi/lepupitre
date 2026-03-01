use super::repo;
use super::types::ProjectListItem;
use crate::kernel::models::ProjectSummary;
use crate::platform::db;

pub fn project_get_active(
    app: &tauri::AppHandle,
    profile_id: &str,
) -> Result<Option<ProjectSummary>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;

    if let Some(active_id) = repo::get_active_project_id(&conn)? {
        if !repo::is_training_project(&conn, &active_id)? {
            if let Some(active) = repo::fetch_project_by_id(&conn, &active_id)? {
                return Ok(Some(active));
            }
        }
    }

    if let Some(latest) = repo::fetch_latest_project(&conn)? {
        let _ = repo::set_active_project_id(&conn, &latest.id);
        return Ok(Some(latest));
    }

    Ok(None)
}

pub fn project_list(
    app: &tauri::AppHandle,
    profile_id: &str,
) -> Result<Vec<ProjectListItem>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let active_id = repo::get_active_project_id(&conn)?;

    let mut projects = repo::select_project_list(&conn)?;
    for project in &mut projects {
        if let Some(ref active) = active_id {
            project.is_active = project.id == *active;
        }
    }

    Ok(projects)
}
