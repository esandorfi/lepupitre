mod blueprint;
mod mascot;
mod progress;
mod queries;
mod repo;
mod types;

use crate::platform::db;
use tauri::AppHandle;

pub use types::{MascotMessage, ProgressSnapshot, TalksBlueprint, TalksBlueprintStep};

pub fn progress_get_snapshot(
    app: &AppHandle,
    profile_id: &str,
    project_id: Option<&str>,
) -> Result<ProgressSnapshot, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let resolved_project_id = repo::resolve_project_id(&conn, project_id)?;
    progress::build_progress_snapshot(&conn, &resolved_project_id)
}

pub fn mascot_get_context_message(
    app: &AppHandle,
    profile_id: &str,
    route_name: &str,
    project_id: Option<&str>,
    locale: Option<&str>,
) -> Result<MascotMessage, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let resolved_project_id = repo::resolve_project_id(&conn, project_id)?;
    let snapshot = progress::build_progress_snapshot(&conn, &resolved_project_id)?;
    Ok(mascot::build_mascot_message(
        route_name.trim().to_ascii_lowercase(),
        locale.unwrap_or("en").to_string(),
        &snapshot,
    ))
}

pub fn talks_get_blueprint(
    app: &AppHandle,
    profile_id: &str,
    project_id: &str,
    locale: Option<&str>,
) -> Result<TalksBlueprint, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    blueprint::build_talks_blueprint(&conn, project_id, locale)
}
