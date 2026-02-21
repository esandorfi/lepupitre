use base64::Engine;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[tauri::command]
pub fn audio_save_wav(app: tauri::AppHandle, base64: String) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64.as_bytes())
        .map_err(|e| format!("decode_base64: {e}"))?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let recordings_dir = app_data_dir.join("recordings");
    std::fs::create_dir_all(&recordings_dir).map_err(|e| format!("create_dir: {e}"))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("timestamp: {e}"))?
        .as_millis();
    let path = recordings_dir.join(format!("recording-{timestamp}.wav"));

    std::fs::write(&path, bytes).map_err(|e| format!("write: {e}"))?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn audio_open_wav(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let recordings_dir = app_data_dir.join("recordings");
    if !recordings_dir.exists() {
        return Err("recordings_dir_missing".to_string());
    }

    let recordings_dir = recordings_dir
        .canonicalize()
        .map_err(|e| format!("recordings_dir: {e}"))?;
    let requested = PathBuf::from(path)
        .canonicalize()
        .map_err(|e| format!("path: {e}"))?;

    if !requested.starts_with(&recordings_dir) {
        return Err("path_not_allowed".to_string());
    }

    open::that(&requested).map_err(|e| format!("open: {e}"))?;
    Ok(())
}
