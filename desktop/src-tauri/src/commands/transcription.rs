use crate::core::{artifacts, asr_models, asr_sidecar, db, ids, models, transcript};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::Emitter;

const EVENT_JOB_PROGRESS: &str = "job:progress";
const EVENT_JOB_COMPLETED: &str = "job:completed";
const EVENT_JOB_FAILED: &str = "job:failed";
const EVENT_ASR_FINAL_PROGRESS: &str = "asr/final_progress/v1";
const EVENT_ASR_FINAL_RESULT: &str = "asr/final_result/v1";
const EVENT_MODEL_DOWNLOAD_PROGRESS: &str = "asr/model_download_progress/v1";

const DEFAULT_MODEL_ID: &str = "tiny";
const SIDECAR_ENV_PATH: &str = "LEPUPITRE_ASR_SIDECAR";
const SIDECAR_MODEL_ENV_PATH: &str = "LEPUPITRE_ASR_MODEL_PATH";
const FINAL_SLOW_DECODE_RATIO: f64 = 1.5;
const MAX_FINAL_SEGMENTS_PER_CHUNK: usize = 200;
const MAX_FINAL_SEGMENTS_TOTAL: usize = 10_000;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeResponse {
    pub transcript_id: String,
    pub job_id: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AsrSettingsPayload {
    model: Option<String>,
    language: Option<String>,
}

#[derive(Debug, Clone)]
struct AsrRuntimeSettings {
    model_id: String,
    language: String,
}

fn normalize_asr_settings(payload: Option<AsrSettingsPayload>) -> AsrRuntimeSettings {
    let mut model_id = DEFAULT_MODEL_ID.to_string();
    let mut language = "auto".to_string();

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
    }

    AsrRuntimeSettings { model_id, language }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct JobProgressEvent {
    pub job_id: String,
    pub stage: String,
    pub pct: u8,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct JobCompletedEvent {
    pub job_id: String,
    pub result_id: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct JobFailedEvent {
    pub job_id: String,
    pub error_code: String,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AsrFinalProgressEvent {
    pub schema_version: String,
    pub processed_ms: i64,
    pub total_ms: i64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AsrFinalResultEvent {
    pub schema_version: String,
    pub text: String,
    pub segments: Vec<models::TranscriptSegment>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AsrModelDownloadProgressEvent {
    pub schema_version: String,
    pub model_id: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TranscriptExportFormat {
    Txt,
    Json,
    Srt,
    Vtt,
}

#[tauri::command]
pub fn transcribe_audio(
    app: tauri::AppHandle,
    profile_id: String,
    audio_artifact_id: String,
    asr_settings: Option<AsrSettingsPayload>,
) -> Result<TranscribeResponse, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let asr_settings = normalize_asr_settings(asr_settings);
    let artifact = artifacts::get_artifact(&app, &profile_id, &audio_artifact_id)?;
    if artifact.artifact_type != "audio" {
        return Err("artifact_not_audio".to_string());
    }

    let job_id = ids::new_id("job");
    emit_progress(&app, &job_id, "transcribe", 5, Some("queued".to_string()))?;

    let result = (|| -> Result<TranscribeResponse, String> {
        let profile_dir = db::profile_dir(&app, &profile_id)?;
        let audio_path = profile_dir.join(&artifact.relpath);
        let audio_bytes = std::fs::read(&audio_path).map_err(|e| format!("audio_read: {e}"))?;

        emit_progress(
            &app,
            &job_id,
            "transcribe",
            35,
            Some("analyze_audio".to_string()),
        )?;

        let (samples, duration_ms) = decode_wav_mono_16k(&audio_bytes)?;
        let total_ms = duration_ms;
        let segments = decode_with_sidecar(&app, &asr_settings, &samples, total_ms)?;
        let segments = transcript::apply_spoken_punctuation(&segments, &asr_settings.language);
        let transcript = models::TranscriptV1 {
            schema_version: "1.0.0".to_string(),
            language: asr_settings.language.clone(),
            model_id: Some(asr_settings.model_id.clone()),
            duration_ms: Some(duration_ms),
            segments,
        };

        emit_progress(
            &app,
            &job_id,
            "transcribe",
            70,
            Some("serialize".to_string()),
        )?;

        let transcript_bytes =
            serde_json::to_vec(&transcript).map_err(|e| format!("transcript_json: {e}"))?;
        let metadata = serde_json::json!({
            "source_audio_artifact_id": audio_artifact_id,
            "provider": "sidecar",
            "job_id": job_id,
        });
        let record = artifacts::store_bytes(
            &app,
            &profile_id,
            "transcript",
            "json",
            &transcript_bytes,
            &metadata,
        )?;

        let text = transcript::transcript_text(&transcript).unwrap_or_else(|_| {
            transcript
                .segments
                .iter()
                .map(|segment| segment.text.trim())
                .filter(|segment| !segment.is_empty())
                .collect::<Vec<&str>>()
                .join(" ")
        });
        let final_text = if text.is_empty() {
            "Transcription terminée.".to_string()
        } else {
            text
        };
        emit_final_result(&app, final_text, transcript.segments.clone())?;

        emit_progress(&app, &job_id, "transcribe", 100, Some("done".to_string()))?;
        emit_completed(&app, &job_id, &record.id)?;

        Ok(TranscribeResponse {
            transcript_id: record.id,
            job_id: job_id.clone(),
        })
    })();

    if let Err(err) = result {
        let _ = emit_failed(&app, &job_id, "transcription_failed", &err);
        return Err(err);
    }

    result
}

#[tauri::command]
pub fn transcript_get(
    app: tauri::AppHandle,
    profile_id: String,
    transcript_id: String,
) -> Result<models::TranscriptV1, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    transcript::load_transcript(&app, &profile_id, &transcript_id)
}

#[tauri::command]
pub fn asr_models_list(app: tauri::AppHandle) -> Result<Vec<models::AsrModelStatus>, String> {
    asr_models::list_models(&app)
}

#[tauri::command]
pub fn asr_model_remove(app: tauri::AppHandle, model_id: String) -> Result<(), String> {
    let spec = asr_models::model_spec(&model_id).ok_or_else(|| "model_unknown".to_string())?;
    let dir = asr_models::models_dir(&app)?;
    let final_path = dir.join(spec.filename);
    let tmp_path = dir.join(format!("{}.download", spec.filename));
    let manifest_path = dir.join(format!("{}.manifest.json", spec.filename));

    if final_path.exists() {
        std::fs::remove_file(&final_path).map_err(|e| format!("model_remove: {e}"))?;
    }
    if tmp_path.exists() {
        let _ = std::fs::remove_file(&tmp_path);
    }
    if manifest_path.exists() {
        let _ = std::fs::remove_file(&manifest_path);
    }

    Ok(())
}

#[tauri::command]
pub fn asr_model_verify(
    app: tauri::AppHandle,
    model_id: String,
) -> Result<models::AsrModelStatus, String> {
    asr_models::verify_model(&app, &model_id)
}

#[tauri::command]
pub async fn asr_model_download(
    app: tauri::AppHandle,
    model_id: String,
) -> Result<models::AsrModelDownloadResult, String> {
    let app_handle = app.clone();
    let model_id_clone = model_id.clone();
    tauri::async_runtime::spawn_blocking(move || {
        download_model_blocking(&app_handle, &model_id_clone)
    })
    .await
    .map_err(|e| format!("download_join: {e}"))?
}

fn download_model_blocking(
    app: &tauri::AppHandle,
    model_id: &str,
) -> Result<models::AsrModelDownloadResult, String> {
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

    crate::commands::assert_valid_event_name(EVENT_MODEL_DOWNLOAD_PROGRESS);

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
        emit_model_download_progress(app, model_id, 0, total_bytes)?;

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
                emit_model_download_progress(app, model_id, downloaded, total_bytes)?;
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
        emit_model_download_progress(app, model_id, downloaded, total_bytes)?;

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

#[tauri::command]
pub fn transcript_export(
    app: tauri::AppHandle,
    profile_id: String,
    transcript_id: String,
    format: TranscriptExportFormat,
) -> Result<models::ExportResult, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let transcript = transcript::load_transcript(&app, &profile_id, &transcript_id)?;

    let (ext, contents) = match format {
        TranscriptExportFormat::Txt => ("txt", transcript::transcript_text(&transcript)?),
        TranscriptExportFormat::Json => (
            "json",
            serde_json::to_string_pretty(&transcript)
                .map_err(|e| format!("transcript_json: {e}"))?,
        ),
        TranscriptExportFormat::Srt => ("srt", transcript::transcript_to_srt(&transcript)?),
        TranscriptExportFormat::Vtt => ("vtt", transcript::transcript_to_vtt(&transcript)?),
    };

    let profile_dir = db::profile_dir(&app, &profile_id)?;
    let export_dir = profile_dir.join("exports").join("transcript");
    std::fs::create_dir_all(&export_dir).map_err(|e| format!("export_dir: {e}"))?;

    let filename = format!("{transcript_id}.{ext}");
    let export_path = export_dir.join(filename);
    std::fs::write(&export_path, contents).map_err(|e| format!("export_write: {e}"))?;

    Ok(models::ExportResult {
        path: export_path.to_string_lossy().to_string(),
    })
}

fn emit_progress(
    app: &tauri::AppHandle,
    job_id: &str,
    stage: &str,
    pct: u8,
    message: Option<String>,
) -> Result<(), String> {
    crate::commands::assert_valid_event_name(EVENT_JOB_PROGRESS);
    app.emit(
        EVENT_JOB_PROGRESS,
        JobProgressEvent {
            job_id: job_id.to_string(),
            stage: stage.to_string(),
            pct,
            message,
        },
    )
    .map_err(|e| format!("emit_progress: {e}"))?;
    Ok(())
}

fn emit_completed(app: &tauri::AppHandle, job_id: &str, result_id: &str) -> Result<(), String> {
    crate::commands::assert_valid_event_name(EVENT_JOB_COMPLETED);
    app.emit(
        EVENT_JOB_COMPLETED,
        JobCompletedEvent {
            job_id: job_id.to_string(),
            result_id: result_id.to_string(),
        },
    )
    .map_err(|e| format!("emit_completed: {e}"))?;
    Ok(())
}

#[allow(dead_code)]
fn emit_failed(
    app: &tauri::AppHandle,
    job_id: &str,
    error_code: &str,
    message: &str,
) -> Result<(), String> {
    crate::commands::assert_valid_event_name(EVENT_JOB_FAILED);
    app.emit(
        EVENT_JOB_FAILED,
        JobFailedEvent {
            job_id: job_id.to_string(),
            error_code: error_code.to_string(),
            message: message.to_string(),
        },
    )
    .map_err(|e| format!("emit_failed: {e}"))?;
    Ok(())
}

fn emit_final_progress(
    app: &tauri::AppHandle,
    processed_ms: i64,
    total_ms: i64,
) -> Result<(), String> {
    crate::commands::assert_valid_event_name(EVENT_ASR_FINAL_PROGRESS);
    app.emit(
        EVENT_ASR_FINAL_PROGRESS,
        AsrFinalProgressEvent {
            schema_version: "1.0.0".to_string(),
            processed_ms,
            total_ms,
        },
    )
    .map_err(|e| format!("emit_final_progress: {e}"))?;
    Ok(())
}

fn emit_final_result(
    app: &tauri::AppHandle,
    text: String,
    segments: Vec<models::TranscriptSegment>,
) -> Result<(), String> {
    crate::commands::assert_valid_event_name(EVENT_ASR_FINAL_RESULT);
    app.emit(
        EVENT_ASR_FINAL_RESULT,
        AsrFinalResultEvent {
            schema_version: "1.0.0".to_string(),
            text,
            segments,
        },
    )
    .map_err(|e| format!("emit_final_result: {e}"))?;
    Ok(())
}

fn emit_model_download_progress(
    app: &tauri::AppHandle,
    model_id: &str,
    downloaded_bytes: u64,
    total_bytes: u64,
) -> Result<(), String> {
    crate::commands::assert_valid_event_name(EVENT_MODEL_DOWNLOAD_PROGRESS);
    app.emit(
        EVENT_MODEL_DOWNLOAD_PROGRESS,
        AsrModelDownloadProgressEvent {
            schema_version: "1.0.0".to_string(),
            model_id: model_id.to_string(),
            downloaded_bytes,
            total_bytes,
        },
    )
    .map_err(|e| format!("emit_model_download: {e}"))?;
    Ok(())
}

fn to_hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}

fn decode_with_sidecar(
    app: &tauri::AppHandle,
    settings: &AsrRuntimeSettings,
    samples: &[f32],
    duration_ms: i64,
) -> Result<Vec<models::TranscriptSegment>, String> {
    let sidecar_path = if let Ok(path) = std::env::var(SIDECAR_ENV_PATH) {
        let path = PathBuf::from(path);
        if path.exists() {
            path
        } else {
            return Err("sidecar_missing".to_string());
        }
    } else {
        asr_sidecar::resolve_sidecar_path(app)?
    };

    let model_path = if let Ok(path) = std::env::var(SIDECAR_MODEL_ENV_PATH) {
        PathBuf::from(path)
    } else {
        let spec = asr_models::model_spec(&settings.model_id)
            .ok_or_else(|| "model_unknown".to_string())?;
        let dir = asr_models::models_dir(app)?;
        let path = dir.join(spec.filename);
        if !path.exists() {
            return Err("model_missing".to_string());
        }
        path
    };

    let mut decoder =
        asr_sidecar::SidecarDecoder::spawn(&sidecar_path, &model_path, &settings.language)?;

    let total_ms = duration_ms.max(0);
    let chunk_ms: i64 = 12_000;
    let sample_rate = 16_000i64;
    let mut segments = Vec::new();
    let mut cursor_ms = 0i64;

    emit_final_progress(app, 0, total_ms)?;

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
                let _ = emit_final_progress(app, absolute_ms, total_ms);
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
        emit_final_progress(app, end_ms, total_ms)?;
        cursor_ms = end_ms;
    }

    Ok(segments)
}

fn decode_wav_mono_16k(bytes: &[u8]) -> Result<(Vec<f32>, i64), String> {
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

#[cfg(test)]
mod transcription_tests {
    use super::*;

    fn fixture_bytes() -> Vec<u8> {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("sine_16k_mono.wav");
        std::fs::read(path).expect("fixture wav")
    }

    #[test]
    fn decode_wav_fixture() {
        let bytes = fixture_bytes();
        let (samples, duration_ms) = decode_wav_mono_16k(&bytes).expect("decode wav");
        assert!(!samples.is_empty());
        assert!(duration_ms > 0);
    }

    #[test]
    fn decode_wav_rejects_wrong_rate() {
        let mut bytes = fixture_bytes();
        bytes[24..28].copy_from_slice(&8000u32.to_le_bytes());
        let err = decode_wav_mono_16k(&bytes).expect_err("should fail");
        assert_eq!(err, "wav_sample_rate");
    }
}
