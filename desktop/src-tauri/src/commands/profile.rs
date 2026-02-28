use crate::core::{db, models::ProfileSummary, workspace};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileDbDiagnosticsReport {
    pub global: db::DbDiagnostics,
    pub profile: Option<db::DbDiagnostics>,
}

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

#[tauri::command]
pub fn profile_db_diagnostics(
    app: tauri::AppHandle,
    profile_id: Option<String>,
) -> Result<ProfileDbDiagnosticsReport, String> {
    let global = db::global_diagnostics(&app)?;
    let profile = match profile_id {
        Some(id) => Some(db::profile_diagnostics(&app, &id)?),
        None => None,
    };
    Ok(ProfileDbDiagnosticsReport { global, profile })
}
