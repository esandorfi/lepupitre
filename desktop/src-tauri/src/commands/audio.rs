use base64::Engine;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

use crate::core::artifacts;
use crate::core::db;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioSaveResult {
    pub path: String,
    pub artifact_id: String,
    pub bytes: u64,
    pub sha256: String,
}

#[tauri::command]
pub fn audio_save_wav(
    app: tauri::AppHandle,
    profile_id: String,
    base64: String,
) -> Result<AudioSaveResult, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64.as_bytes())
        .map_err(|e| format!("decode_base64: {e}"))?;

    db::ensure_profile_exists(&app, &profile_id)?;

    let metadata = serde_json::json!({
        "format": "wav",
        "sample_rate_hz": 16000,
        "channels": 1
    });
    let record = artifacts::store_bytes(&app, &profile_id, "audio", "wav", &bytes, &metadata)?;

    Ok(AudioSaveResult {
        path: record.abspath.to_string_lossy().to_string(),
        artifact_id: record.id,
        bytes: record.bytes,
        sha256: record.sha256,
    })
}

#[tauri::command]
pub fn audio_reveal_wav(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let app_data_dir = app_data_dir
        .canonicalize()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let requested = PathBuf::from(path)
        .canonicalize()
        .map_err(|e| format!("path: {e}"))?;

    if !requested.starts_with(&app_data_dir) {
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
