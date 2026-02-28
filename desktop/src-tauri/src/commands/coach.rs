use crate::core::coach as coach_core;

pub use coach_core::{MascotMessage, ProgressSnapshot, TalksBlueprint};

#[tauri::command]
pub fn progress_get_snapshot(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: Option<String>,
) -> Result<ProgressSnapshot, String> {
    coach_core::progress_get_snapshot(&app, &profile_id, project_id.as_deref())
}

#[tauri::command]
pub fn mascot_get_context_message(
    app: tauri::AppHandle,
    profile_id: String,
    route_name: String,
    project_id: Option<String>,
    locale: Option<String>,
) -> Result<MascotMessage, String> {
    coach_core::mascot_get_context_message(
        &app,
        &profile_id,
        &route_name,
        project_id.as_deref(),
        locale.as_deref(),
    )
}

#[tauri::command]
pub fn talks_get_blueprint(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    locale: Option<String>,
) -> Result<TalksBlueprint, String> {
    coach_core::talks_get_blueprint(&app, &profile_id, &project_id, locale.as_deref())
}
