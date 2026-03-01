use crate::domain::asr::asr_models;
use crate::kernel::models;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{Read, Write};
use std::time::{Duration, Instant};
use tauri::AppHandle;

pub fn download_model_blocking<F>(
    app: &AppHandle,
    model_id: &str,
    mut on_progress: F,
) -> Result<models::AsrModelDownloadResult, String>
where
    F: FnMut(u64, u64),
{
    let spec = asr_models::model_spec(model_id).ok_or_else(|| "model_unknown".to_string())?;
    let dir = asr_models::models_dir(app)?;
    let final_path = dir.join(spec.filename);

    if final_path.exists() {
        let models = asr_models::list_models(app)?;
        if let Some(model) = models
            .iter()
            .find(|model| model.id == model_id && model.installed)
        {
            let bytes = model.size_bytes.unwrap_or(model.expected_bytes);
            return Ok(models::AsrModelDownloadResult {
                model_id: model_id.to_string(),
                path: model
                    .path
                    .clone()
                    .unwrap_or_else(|| final_path.to_string_lossy().to_string()),
                bytes,
                sha256: model.expected_sha256.clone(),
            });
        }
    }

    let tmp_path = dir.join(format!("{}.download", spec.filename));
    let result = (|| -> Result<models::AsrModelDownloadResult, String> {
        let client = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(60 * 30))
            .user_agent("LePupitre")
            .build()
            .map_err(|e| format!("download_client: {e}"))?;
        let mut response = client
            .get(spec.url)
            .send()
            .map_err(|e| format!("download_request: {e}"))?;
        if !response.status().is_success() {
            return Err(format!("download_status: {}", response.status()));
        }

        let total_bytes = response.content_length().unwrap_or(spec.size_bytes);
        on_progress(0, total_bytes);

        let mut file = File::create(&tmp_path).map_err(|e| format!("download_create: {e}"))?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 16 * 1024];
        let mut downloaded = 0u64;
        let mut last_emit_bytes = 0u64;
        let mut last_emit_at = Instant::now();

        loop {
            let read = response
                .read(&mut buffer)
                .map_err(|e| format!("download_read: {e}"))?;
            if read == 0 {
                break;
            }
            file.write_all(&buffer[..read])
                .map_err(|e| format!("download_write: {e}"))?;
            hasher.update(&buffer[..read]);
            downloaded += read as u64;

            if downloaded.saturating_sub(last_emit_bytes) >= 1_048_576
                || last_emit_at.elapsed() >= Duration::from_millis(250)
            {
                on_progress(downloaded, total_bytes);
                last_emit_bytes = downloaded;
                last_emit_at = Instant::now();
            }
        }

        file.flush().map_err(|e| format!("download_flush: {e}"))?;

        if spec.size_bytes > 0 && downloaded != spec.size_bytes {
            return Err("download_size_mismatch".to_string());
        }

        let sha256 = to_hex(&hasher.finalize());
        if sha256 != spec.sha256 {
            return Err("download_checksum_mismatch".to_string());
        }

        std::fs::rename(&tmp_path, &final_path).map_err(|e| format!("download_finalize: {e}"))?;
        asr_models::store_manifest(&dir, spec.filename, &sha256, downloaded)?;
        on_progress(downloaded, total_bytes);

        Ok(models::AsrModelDownloadResult {
            model_id: model_id.to_string(),
            path: final_path.to_string_lossy().to_string(),
            bytes: downloaded,
            sha256,
        })
    })();

    if result.is_err() {
        let _ = std::fs::remove_file(&tmp_path);
    }

    result
}

fn to_hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}
