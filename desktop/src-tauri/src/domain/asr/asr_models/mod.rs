mod integrity;
mod specs;

use crate::kernel::models;
use std::path::{Path, PathBuf};
use tauri::Manager;

pub use specs::{model_spec, model_specs, AsrModelSpec};

pub fn models_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let dir = app_dir.join("models").join("whisper");
    std::fs::create_dir_all(&dir).map_err(|e| format!("models_dir: {e}"))?;
    Ok(dir)
}

pub fn list_models(app: &tauri::AppHandle) -> Result<Vec<models::AsrModelStatus>, String> {
    let dir = models_dir(app)?;
    let mut out = Vec::new();

    for spec in model_specs() {
        let path = dir.join(spec.filename);
        if path.exists() {
            let size_bytes = std::fs::metadata(&path).map(|meta| meta.len()).ok();
            let manifest = integrity::read_manifest(&manifest_path(&dir, spec.filename));
            let mut installed = false;
            let mut checksum_ok = None;

            if let Some(actual_size) = size_bytes {
                if actual_size != spec.size_bytes {
                    checksum_ok = Some(false);
                } else if let Some(manifest) = manifest {
                    let ok = manifest.sha256 == spec.sha256 && manifest.size_bytes == actual_size;
                    checksum_ok = Some(ok);
                    installed = ok;
                } else {
                    installed = true;
                }
            } else {
                checksum_ok = Some(false);
            }

            out.push(models::AsrModelStatus {
                id: spec.id.to_string(),
                label: spec.label.to_string(),
                bundled: spec.bundled,
                installed,
                expected_bytes: spec.size_bytes,
                expected_sha256: spec.sha256.to_string(),
                source_url: spec.url.to_string(),
                path: Some(path.to_string_lossy().to_string()),
                size_bytes,
                checksum_ok,
            });
        } else {
            out.push(models::AsrModelStatus {
                id: spec.id.to_string(),
                label: spec.label.to_string(),
                bundled: spec.bundled,
                installed: false,
                expected_bytes: spec.size_bytes,
                expected_sha256: spec.sha256.to_string(),
                source_url: spec.url.to_string(),
                path: None,
                size_bytes: None,
                checksum_ok: None,
            });
        }
    }

    Ok(out)
}

pub fn verify_model(
    app: &tauri::AppHandle,
    model_id: &str,
) -> Result<models::AsrModelStatus, String> {
    let spec = model_spec(model_id).ok_or_else(|| "model_unknown".to_string())?;
    let dir = models_dir(app)?;
    let path = dir.join(spec.filename);

    if !path.exists() {
        return Err("model_missing".to_string());
    }

    let (sha256, size_bytes) = integrity::sha256_file(&path)?;
    store_manifest(&dir, spec.filename, &sha256, size_bytes)?;

    let checksum_ok = sha256 == spec.sha256 && size_bytes == spec.size_bytes;

    Ok(models::AsrModelStatus {
        id: spec.id.to_string(),
        label: spec.label.to_string(),
        bundled: spec.bundled,
        installed: checksum_ok,
        expected_bytes: spec.size_bytes,
        expected_sha256: spec.sha256.to_string(),
        source_url: spec.url.to_string(),
        path: Some(path.to_string_lossy().to_string()),
        size_bytes: Some(size_bytes),
        checksum_ok: Some(checksum_ok),
    })
}

pub fn store_manifest(
    dir: &Path,
    filename: &str,
    sha256: &str,
    size_bytes: u64,
) -> Result<(), String> {
    integrity::write_manifest(
        &manifest_path(dir, filename),
        &integrity::AsrModelManifest {
            sha256: sha256.to_string(),
            size_bytes,
        },
    )
}

fn manifest_path(dir: &Path, filename: &str) -> PathBuf {
    dir.join(format!("{filename}.manifest.json"))
}
