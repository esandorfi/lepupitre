use crate::core::preferences as preferences_core;

#[tauri::command]
pub fn preference_global_get(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    preferences_core::preference_global_get(&app, &key)
}

#[tauri::command]
pub fn preference_global_set(
    app: tauri::AppHandle,
    key: String,
    value: Option<String>,
) -> Result<(), String> {
    preferences_core::preference_global_set(&app, &key, value.as_deref())
}

#[tauri::command]
pub fn preference_profile_get(
    app: tauri::AppHandle,
    profile_id: String,
    key: String,
) -> Result<Option<String>, String> {
    preferences_core::preference_profile_get(&app, &profile_id, &key)
}

#[tauri::command]
pub fn preference_profile_set(
    app: tauri::AppHandle,
    profile_id: String,
    key: String,
    value: Option<String>,
) -> Result<(), String> {
    preferences_core::preference_profile_set(&app, &profile_id, &key, value.as_deref())
}
