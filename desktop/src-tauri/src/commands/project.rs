use crate::core::{models, project as project_core};

pub use project_core::ProjectListItem;

#[tauri::command]
pub fn project_create(
    app: tauri::AppHandle,
    profile_id: String,
    payload: models::ProjectCreatePayload,
) -> Result<String, String> {
    project_core::project_create(&app, &profile_id, payload)
}

#[tauri::command]
pub fn project_ensure_training(
    app: tauri::AppHandle,
    profile_id: String,
) -> Result<String, String> {
    project_core::project_ensure_training(&app, &profile_id)
}

#[tauri::command]
pub fn project_update(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    payload: models::ProjectUpdatePayload,
) -> Result<(), String> {
    project_core::project_update(&app, &profile_id, &project_id, payload)
}

#[tauri::command]
pub fn project_get_active(
    app: tauri::AppHandle,
    profile_id: String,
) -> Result<Option<models::ProjectSummary>, String> {
    project_core::project_get_active(&app, &profile_id)
}

#[tauri::command]
pub fn project_list(
    app: tauri::AppHandle,
    profile_id: String,
) -> Result<Vec<ProjectListItem>, String> {
    project_core::project_list(&app, &profile_id)
}

#[tauri::command]
pub fn project_set_active(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<(), String> {
    project_core::project_set_active(&app, &profile_id, &project_id)
}
