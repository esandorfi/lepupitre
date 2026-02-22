use crate::core::models;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;
use tauri::Manager;

pub struct AsrModelSpec {
    pub id: &'static str,
    pub label: &'static str,
    pub filename: &'static str,
    pub url: &'static str,
    pub sha256: &'static str,
    pub size_bytes: u64,
    pub bundled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AsrModelManifest {
    sha256: String,
    size_bytes: u64,
}

const MODEL_SPECS: [AsrModelSpec; 2] = [
    AsrModelSpec {
        id: "tiny",
        label: "Tiny",
        filename: "ggml-tiny.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
        sha256: "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21",
        size_bytes: 77_691_713,
        bundled: true,
    },
    AsrModelSpec {
        id: "base",
        label: "Base",
        filename: "ggml-base.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
        sha256: "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
        size_bytes: 147_951_465,
        bundled: false,
    },
];

pub fn model_specs() -> &'static [AsrModelSpec] {
    &MODEL_SPECS
}

pub fn model_spec(model_id: &str) -> Option<&'static AsrModelSpec> {
    MODEL_SPECS.iter().find(|spec| spec.id == model_id)
}

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

    for spec in &MODEL_SPECS {
        let path = dir.join(spec.filename);
        if path.exists() {
            let size_bytes = std::fs::metadata(&path).map(|meta| meta.len()).ok();
            let manifest = read_manifest(&manifest_path(&dir, spec.filename));
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

    let (sha256, size_bytes) = sha256_file(&path)?;
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
    dir: &PathBuf,
    filename: &str,
    sha256: &str,
    size_bytes: u64,
) -> Result<(), String> {
    let manifest = AsrModelManifest {
        sha256: sha256.to_string(),
        size_bytes,
    };
    write_manifest(&manifest_path(dir, filename), &manifest)
}

fn manifest_path(dir: &PathBuf, filename: &str) -> PathBuf {
    dir.join(format!("{filename}.manifest.json"))
}

fn read_manifest(path: &PathBuf) -> Option<AsrModelManifest> {
    let data = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

fn write_manifest(path: &PathBuf, manifest: &AsrModelManifest) -> Result<(), String> {
    let payload = serde_json::to_string(manifest).map_err(|e| format!("manifest_json: {e}"))?;
    std::fs::write(path, payload).map_err(|e| format!("manifest_write: {e}"))?;
    Ok(())
}

fn sha256_file(path: &PathBuf) -> Result<(String, u64), String> {
    let mut file = File::open(path).map_err(|e| format!("model_open: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    let mut total = 0u64;

    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|e| format!("model_read: {e}"))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
        total += read as u64;
    }

    Ok((to_hex(&hasher.finalize()), total))
}

fn to_hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn model_specs_are_consistent() {
        let specs = model_specs();
        let mut ids = std::collections::HashSet::new();
        for spec in specs {
            assert!(ids.insert(spec.id), "duplicate model id: {}", spec.id);
            assert!(spec.filename.ends_with(".bin"));
            assert!(spec.url.starts_with("https://"));
            assert!(spec.size_bytes > 0);
            assert_eq!(spec.sha256.len(), 64);
        }
    }
}
