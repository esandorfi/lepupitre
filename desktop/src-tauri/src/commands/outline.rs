use crate::core::{models, outline as outline_core};

#[tauri::command]
pub fn outline_get(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<models::OutlineDoc, String> {
    outline_core::outline_get(&app, &profile_id, &project_id)
}

#[tauri::command]
pub fn outline_set(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    markdown: String,
) -> Result<(), String> {
    outline_core::outline_set(&app, &profile_id, &project_id, &markdown)
}

#[tauri::command]
pub fn export_outline(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<models::ExportResult, String> {
    outline_core::export_outline(&app, &profile_id, &project_id)
}
