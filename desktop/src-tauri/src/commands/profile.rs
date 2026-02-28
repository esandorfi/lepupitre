use crate::core::{models::ProfileSummary, workspace};

#[tauri::command]
pub fn profile_list(app: tauri::AppHandle) -> Result<Vec<ProfileSummary>, String> {
    workspace::profile_list(&app)
}

#[tauri::command]
pub fn profile_create(app: tauri::AppHandle, name: String) -> Result<String, String> {
    workspace::profile_create(&app, &name)
}

#[tauri::command]
pub fn profile_switch(app: tauri::AppHandle, profile_id: String) -> Result<(), String> {
    workspace::profile_switch(&app, &profile_id)
}

#[tauri::command]
pub fn profile_rename(
    app: tauri::AppHandle,
    profile_id: String,
    name: String,
) -> Result<(), String> {
    workspace::profile_rename(&app, &profile_id, &name)
}

#[tauri::command]
pub fn profile_delete(app: tauri::AppHandle, profile_id: String) -> Result<(), String> {
    workspace::profile_delete(&app, &profile_id)
}
