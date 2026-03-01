use crate::core::{asr_models, asr_sidecar, models, time};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::AppHandle;

const DEFAULT_MODEL_ID: &str = "tiny";
const SIDECAR_ENV_PATH: &str = "LEPUPITRE_ASR_SIDECAR";
const SIDECAR_MODEL_ENV_PATH: &str = "LEPUPITRE_ASR_MODEL_PATH";
const FINAL_SLOW_DECODE_RATIO: f64 = 1.5;
const MAX_FINAL_SEGMENTS_PER_CHUNK: usize = 200;
const MAX_FINAL_SEGMENTS_TOTAL: usize = 10_000;
const ASR_DIAGNOSTICS_SCHEMA_VERSION: &str = "1.0.0";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrDiagnosticsBundle {
    pub schema_version: String,
    pub generated_at: String,
    pub app_version: String,
    pub platform: AsrDiagnosticsPlatform,
    pub sidecar: AsrDiagnosticsSidecar,
    pub models: Vec<AsrDiagnosticsModel>,
    pub known_error_signatures: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrDiagnosticsPlatform {
    pub os: String,
    pub arch: String,
    pub family: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrDiagnosticsSidecar {
    pub status: String,
    pub path_hint: Option<String>,
    pub status_error: Option<String>,
    pub details: Option<asr_sidecar::SidecarStatus>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrDiagnosticsModel {
    pub id: String,
    pub installed: bool,
    pub checksum_ok: Option<bool>,
    pub size_bytes: Option<u64>,
    pub expected_bytes: u64,
    pub expected_sha256: String,
    pub source_url: String,
    pub path_hint: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionAsrSettingsPayload {
    pub model: Option<String>,
    pub language: Option<String>,
    pub spoken_punctuation: Option<bool>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "camelCase")]
pub struct RecordingAsrSettingsPayload {
    pub model: Option<String>,
    pub mode: Option<String>,
    pub language: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AsrRuntimeSettings {
    pub model_id: String,
    pub language: String,
    pub spoken_punctuation: bool,
}

#[derive(Debug, Clone)]
pub struct RecordingAsrRuntimeSettings {
    pub model_id: String,
    pub language: String,
    pub live_enabled: bool,
    pub auto_benchmark: bool,
}

pub fn normalize_transcription_settings(
    payload: Option<TranscriptionAsrSettingsPayload>,
) -> AsrRuntimeSettings {
    let mut model_id = DEFAULT_MODEL_ID.to_string();
    let mut language = "auto".to_string();
    let mut spoken_punctuation = false;

    if let Some(payload) = payload {
        if let Some(model) = payload.model.as_deref() {
            if model == "tiny" || model == "base" {
                model_id = model.to_string();
            }
        }
        if let Some(language_value) = payload.language.as_deref() {
            if language_value == "auto" || language_value == "en" || language_value == "fr" {
                language = language_value.to_string();
            }
        }
        if let Some(value) = payload.spoken_punctuation {
            spoken_punctuation = value;
        }
    }

    AsrRuntimeSettings {
        model_id,
        language,
        spoken_punctuation,
    }
}

pub fn normalize_recording_settings(
    payload: Option<RecordingAsrSettingsPayload>,
) -> RecordingAsrRuntimeSettings {
    let mut model_id = DEFAULT_MODEL_ID.to_string();
    let mut language = "auto".to_string();
    let mut live_enabled = true;
    let mut auto_benchmark = false;

    if let Some(payload) = payload {
        if let Some(model) = payload.model.as_deref() {
            if model == "tiny" || model == "base" {
                model_id = model.to_string();
            }
        }
        if let Some(language_value) = payload.language.as_deref() {
            if language_value == "auto" || language_value == "en" || language_value == "fr" {
                language = language_value.to_string();
            }
        }
        if let Some(mode) = payload.mode.as_deref() {
            if mode == "final-only" {
                live_enabled = false;
            } else if mode == "auto" && model_id == "tiny" {
                auto_benchmark = true;
            }
        }
    }

    RecordingAsrRuntimeSettings {
        model_id,
        language,
        live_enabled,
        auto_benchmark,
    }
}

pub fn decode_wav_mono_16k(bytes: &[u8]) -> Result<(Vec<f32>, i64), String> {
    if bytes.len() < 44 {
        return Err("wav_header".to_string());
    }
    if &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" || &bytes[12..16] != b"fmt " {
        return Err("wav_header".to_string());
    }
    let audio_format = u16::from_le_bytes([bytes[20], bytes[21]]);
    let channels = u16::from_le_bytes([bytes[22], bytes[23]]);
    let sample_rate = u32::from_le_bytes([bytes[24], bytes[25], bytes[26], bytes[27]]);
    let bits_per_sample = u16::from_le_bytes([bytes[34], bytes[35]]);
    if audio_format != 1 || channels != 1 || bits_per_sample != 16 {
        return Err("wav_format".to_string());
    }
    if sample_rate != 16_000 {
        return Err("wav_sample_rate".to_string());
    }
    if &bytes[36..40] != b"data" {
        return Err("wav_data".to_string());
    }
    let data_size = u32::from_le_bytes([bytes[40], bytes[41], bytes[42], bytes[43]]) as usize;
    let data_start = 44;
    let data_end = data_start + data_size;
    if bytes.len() < data_end {
        return Err("wav_data".to_string());
    }
    let mut samples = Vec::with_capacity(data_size / 2);
    for chunk in bytes[data_start..data_end].chunks_exact(2) {
        let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
        samples.push(sample as f32 / 32768.0);
    }
    let duration_ms = ((samples.len() as f64 / sample_rate as f64) * 1000.0).round() as i64;
    Ok((samples, duration_ms))
}

pub fn decode_with_sidecar<F>(
    app: &AppHandle,
    settings: &AsrRuntimeSettings,
    samples: &[f32],
    duration_ms: i64,
    mut on_progress: F,
) -> Result<Vec<models::TranscriptSegment>, String>
where
    F: FnMut(i64, i64),
{
    let sidecar_path = resolve_sidecar_path(app)?;
    let model_path = resolve_model_path(app, &settings.model_id)?;

    let mut decoder =
        asr_sidecar::SidecarDecoder::spawn(&sidecar_path, &model_path, &settings.language)?;

    let total_ms = duration_ms.max(0);
    let chunk_ms: i64 = 12_000;
    let sample_rate = 16_000i64;
    let mut segments = Vec::new();
    let mut cursor_ms = 0i64;

    on_progress(0, total_ms);

    while cursor_ms < total_ms {
        let end_ms = (cursor_ms + chunk_ms).min(total_ms);
        let start_idx = (cursor_ms * sample_rate / 1000).max(0) as usize;
        let end_idx = (end_ms * sample_rate / 1000).max(0) as usize;
        if start_idx >= samples.len() {
            break;
        }
        let end_idx = end_idx.min(samples.len());
        let chunk = &samples[start_idx..end_idx];
        let chunk_ms = (end_ms - cursor_ms).max(0) as f64;
        let decode_start = Instant::now();
        let mut chunk_segments = decoder.decode_window_with_progress(
            chunk,
            cursor_ms,
            end_ms,
            asr_sidecar::DecodeMode::Final,
            |processed_ms: i64, total_chunk_ms: i64| {
                if total_chunk_ms <= 0 {
                    return;
                }
                let clamped = processed_ms.clamp(0, total_chunk_ms);
                let absolute_ms = (cursor_ms + clamped).min(total_ms);
                on_progress(absolute_ms, total_ms);
            },
        )?;
        if chunk_segments.len() > MAX_FINAL_SEGMENTS_PER_CHUNK {
            eprintln!(
                "asr final decode truncated: {} segments in chunk (limit {})",
                chunk_segments.len(),
                MAX_FINAL_SEGMENTS_PER_CHUNK
            );
            chunk_segments.truncate(MAX_FINAL_SEGMENTS_PER_CHUNK);
        }
        if chunk_ms > 0.0 {
            let elapsed_ms = decode_start.elapsed().as_millis() as f64;
            let ratio = elapsed_ms / chunk_ms;
            if ratio > FINAL_SLOW_DECODE_RATIO {
                eprintln!(
                    "asr final decode slow: {:.2}x ({}ms for {}ms window)",
                    ratio,
                    elapsed_ms.round() as i64,
                    chunk_ms.round() as i64
                );
            }
        }
        segments.append(&mut chunk_segments);
        if segments.len() > MAX_FINAL_SEGMENTS_TOTAL {
            eprintln!(
                "asr final decode capped: {} segments total (limit {})",
                segments.len(),
                MAX_FINAL_SEGMENTS_TOTAL
            );
            segments.truncate(MAX_FINAL_SEGMENTS_TOTAL);
            break;
        }
        on_progress(end_ms, total_ms);
        cursor_ms = end_ms;
    }

    Ok(segments)
}

fn resolve_sidecar_path(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var(SIDECAR_ENV_PATH) {
        let path = PathBuf::from(path);
        if path.exists() {
            return Ok(path);
        }
        return Err("sidecar_missing".to_string());
    }
    asr_sidecar::resolve_sidecar_path(app)
}

fn resolve_model_path(app: &AppHandle, model_id: &str) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var(SIDECAR_MODEL_ENV_PATH) {
        return Ok(PathBuf::from(path));
    }

    let spec = asr_models::model_spec(model_id).ok_or_else(|| "model_unknown".to_string())?;
    let dir = asr_models::models_dir(app)?;
    let path = dir.join(spec.filename);
    if !path.exists() {
        return Err("model_missing".to_string());
    }
    Ok(path)
}

pub fn spawn_sidecar_decoder(
    app: &AppHandle,
    model_id: &str,
    language: &str,
) -> Result<asr_sidecar::SidecarDecoder, String> {
    let sidecar_path = resolve_sidecar_path(app)?;
    let model_path = resolve_model_path(app, model_id)?;
    asr_sidecar::SidecarDecoder::spawn(&sidecar_path, &model_path, language)
}

pub fn build_diagnostics_bundle(
    app: &AppHandle,
    known_error_signatures: &[&str],
) -> Result<AsrDiagnosticsBundle, String> {
    let sidecar = match asr_sidecar::resolve_sidecar_status(app) {
        Ok(status) => AsrDiagnosticsSidecar {
            status: "ok".to_string(),
            path_hint: redact_path_hint(Some(status.path.as_str())),
            status_error: None,
            details: Some(status),
        },
        Err(code) => {
            let path_hint = asr_sidecar::resolve_sidecar_path(app)
                .ok()
                .and_then(|path| redact_path_hint(path.to_str()));
            AsrDiagnosticsSidecar {
                status: "error".to_string(),
                path_hint,
                status_error: Some(code),
                details: None,
            }
        }
    };

    let models = asr_models::list_models(app)?
        .into_iter()
        .map(|model| AsrDiagnosticsModel {
            id: model.id,
            installed: model.installed,
            checksum_ok: model.checksum_ok,
            size_bytes: model.size_bytes,
            expected_bytes: model.expected_bytes,
            expected_sha256: model.expected_sha256,
            source_url: model.source_url,
            path_hint: redact_path_hint(model.path.as_deref()),
        })
        .collect();

    Ok(AsrDiagnosticsBundle {
        schema_version: ASR_DIAGNOSTICS_SCHEMA_VERSION.to_string(),
        generated_at: time::now_rfc3339(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        platform: AsrDiagnosticsPlatform {
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            family: std::env::consts::FAMILY.to_string(),
        },
        sidecar,
        models,
        known_error_signatures: known_error_signatures
            .iter()
            .map(|value| (*value).to_string())
            .collect(),
    })
}

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

fn redact_path_hint(path: Option<&str>) -> Option<String> {
    let raw = path?.trim();
    if raw.is_empty() {
        return None;
    }
    let filename = std::path::Path::new(raw)
        .file_name()
        .and_then(|value| value.to_str())
        .map(|value| value.to_string());
    filename.or_else(|| Some("<redacted>".to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_recording_settings_enables_auto_benchmark_for_tiny_auto() {
        let settings = normalize_recording_settings(Some(RecordingAsrSettingsPayload {
            model: Some("tiny".to_string()),
            mode: Some("auto".to_string()),
            language: Some("en".to_string()),
        }));
        assert_eq!(settings.model_id, "tiny");
        assert_eq!(settings.language, "en");
        assert!(settings.live_enabled);
        assert!(settings.auto_benchmark);
    }

    #[test]
    fn normalize_recording_settings_disables_live_for_final_only() {
        let settings = normalize_recording_settings(Some(RecordingAsrSettingsPayload {
            model: Some("base".to_string()),
            mode: Some("final-only".to_string()),
            language: Some("fr".to_string()),
        }));
        assert_eq!(settings.model_id, "base");
        assert_eq!(settings.language, "fr");
        assert!(!settings.live_enabled);
        assert!(!settings.auto_benchmark);
    }

    #[test]
    fn redact_path_hint_keeps_filename_only() {
        let redacted = redact_path_hint(Some("C:/Users/name/AppData/models/ggml-tiny.bin"));
        assert_eq!(redacted.as_deref(), Some("ggml-tiny.bin"));
    }

    #[test]
    fn redact_path_hint_handles_missing_values() {
        assert_eq!(redact_path_hint(None), None);
        assert_eq!(redact_path_hint(Some("   ")), None);
    }
}
