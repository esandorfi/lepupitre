use crate::core::{artifacts, asr_models, db, ids, models, transcript};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{Read, Write};
use std::time::{Duration, Instant};
use tauri::Emitter;

const EVENT_JOB_PROGRESS: &str = "job:progress";
const EVENT_JOB_COMPLETED: &str = "job:completed";
const EVENT_JOB_FAILED: &str = "job:failed";
const EVENT_ASR_FINAL_PROGRESS: &str = "asr/final_progress/v1";
const EVENT_ASR_FINAL_RESULT: &str = "asr/final_result/v1";
const EVENT_MODEL_DOWNLOAD_PROGRESS: &str = "asr/model_download_progress/v1";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeResponse {
    pub transcript_id: String,
    pub job_id: String,
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
) -> Result<TranscribeResponse, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
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

        let duration_ms = wav_duration_ms(&audio_bytes);
        let total_ms = duration_ms.unwrap_or(0);
        emit_final_progress(&app, 0, total_ms)?;

        let transcript = build_stub_transcript(duration_ms);

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
            "provider": "mock",
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

        emit_final_progress(&app, total_ms, total_ms)?;
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

fn wav_duration_ms(bytes: &[u8]) -> Option<i64> {
    if bytes.len() < 44 {
        return None;
    }
    let channels = u16::from_le_bytes([bytes[22], bytes[23]]) as u32;
    let sample_rate = u32::from_le_bytes([bytes[24], bytes[25], bytes[26], bytes[27]]);
    let bits_per_sample = u16::from_le_bytes([bytes[34], bytes[35]]) as u32;
    let data_size = u32::from_le_bytes([bytes[40], bytes[41], bytes[42], bytes[43]]);
    if channels == 0 || sample_rate == 0 || bits_per_sample == 0 {
        return None;
    }
    let bytes_per_sample = bits_per_sample / 8;
    if bytes_per_sample == 0 {
        return None;
    }
    let sample_count = data_size / bytes_per_sample / channels;
    Some(((sample_count as f64 / sample_rate as f64) * 1000.0) as i64)
}

fn build_stub_transcript(duration_ms: Option<i64>) -> models::TranscriptV1 {
    models::TranscriptV1 {
        schema_version: "1.0.0".to_string(),
        language: "fr".to_string(),
        model_id: Some("mock".to_string()),
        duration_ms,
        segments: vec![models::TranscriptSegment {
            t_start_ms: 0,
            t_end_ms: duration_ms.unwrap_or(1000).max(1000),
            text: "Transcription en cours — remplacement par whisper.cpp requis.".to_string(),
            confidence: None,
        }],
    }
}
