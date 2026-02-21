use base64::Engine;
use tauri::Manager;
use std::time::{SystemTime, UNIX_EPOCH};

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
