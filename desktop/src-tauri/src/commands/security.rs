use std::path::PathBuf;
use tauri::Manager;

#[tauri::command]
pub fn security_probe_fs(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?
        .canonicalize()
        .map_err(|e| format!("app_data_dir: {e}"))?;

    let requested = PathBuf::from(path)
        .canonicalize()
        .map_err(|e| format!("path: {e}"))?;

    if !requested.starts_with(&app_data_dir) {
        return Err("path_not_allowed".to_string());
    }

    let metadata = std::fs::metadata(&requested).map_err(|e| format!("metadata: {e}"))?;
    Ok(format!("allowed:{:?}", metadata.file_type()))
}

#[tauri::command]
pub fn security_prepare_appdata_file(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;

    let probe_dir = app_data_dir.join("probe");
    std::fs::create_dir_all(&probe_dir).map_err(|e| format!("create_dir: {e}"))?;

    let probe_file = probe_dir.join("allow.txt");
    std::fs::write(&probe_file, "probe").map_err(|e| format!("write: {e}"))?;

    let canonical = probe_file
        .canonicalize()
        .map_err(|e| format!("canonicalize: {e}"))?;

    Ok(canonical.to_string_lossy().to_string())
}
