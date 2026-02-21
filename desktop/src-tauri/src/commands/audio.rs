use base64::Engine;
use std::path::{Path, PathBuf};
use std::process::Command;
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
pub fn audio_reveal_wav(app: tauri::AppHandle, path: String) -> Result<(), String> {
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

    reveal_in_file_manager(&requested)?;
    Ok(())
}

fn reveal_in_file_manager(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .arg("-R")
            .arg(path)
            .status()
            .map_err(|e| format!("open: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            Err("open_failed".to_string())
        }
    }

    #[cfg(target_os = "windows")]
    {
        let arg = format!("/select,{}", path.display());
        let status = Command::new("explorer")
            .arg(arg)
            .status()
            .map_err(|e| format!("explorer: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            Err("explorer_failed".to_string())
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let parent_dir = path
            .parent()
            .ok_or_else(|| "path_missing_parent".to_string())?;
        let status = Command::new("xdg-open")
            .arg(parent_dir)
            .status()
            .map_err(|e| format!("xdg-open: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            Err("xdg_open_failed".to_string())
        }
    }
}
