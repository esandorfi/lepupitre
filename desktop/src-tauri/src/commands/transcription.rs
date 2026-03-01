use crate::core::{artifacts, ids, models, transcript};
use crate::domain::asr::{self, asr_models};
use crate::platform::{asr_sidecar, db};
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tauri::Manager;

const EVENT_JOB_PROGRESS: &str = "job:progress";
const EVENT_JOB_COMPLETED: &str = "job:completed";
const EVENT_JOB_FAILED: &str = "job:failed";
const EVENT_ASR_FINAL_PROGRESS: &str = "asr/final_progress/v1";
const EVENT_ASR_FINAL_RESULT: &str = "asr/final_result/v1";
const EVENT_MODEL_DOWNLOAD_PROGRESS: &str = "asr/model_download_progress/v1";

const KNOWN_ASR_ERROR_SIGNATURES: [&str; 8] = [
    "sidecar_missing",
    "sidecar_doctor_failed",
    "sidecar_doctor_invalid",
    "sidecar_protocol_incompatible",
    "sidecar_unsupported_runtime_capability",
    "model_missing",
    "sidecar_init_timeout",
    "sidecar_decode_timeout",
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeResponse {
    pub transcript_id: String,
    pub job_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptEditSaveResponse {
    pub transcript_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrDiagnosticsExportResponse {
    pub path: String,
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
    asr_settings: Option<asr::TranscriptionAsrSettingsPayload>,
) -> Result<TranscribeResponse, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let asr_settings = asr::normalize_transcription_settings(asr_settings);
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

        let (samples, duration_ms) = asr::decode_wav_mono_16k(&audio_bytes)?;
        let total_ms = duration_ms;
        let segments = asr::decode_with_sidecar(
            &app,
            &asr_settings,
            &samples,
            total_ms,
            |processed, total| {
                let _ = emit_final_progress(&app, processed, total);
            },
        )?;
        let segments = if asr_settings.spoken_punctuation {
            transcript::apply_spoken_punctuation(&segments, &asr_settings.language)
        } else {
            segments
        };
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
pub fn transcript_edit_save(
    app: tauri::AppHandle,
    profile_id: String,
    transcript_id: String,
    edited_text: String,
) -> Result<TranscriptEditSaveResponse, String> {
    db::ensure_profile_exists(&app, &profile_id)?;

    let source = transcript::load_transcript(&app, &profile_id, &transcript_id)?;
    let edited = transcript::build_edited_transcript(&source, &edited_text)?;
    let transcript_bytes =
        serde_json::to_vec(&edited).map_err(|e| format!("transcript_json: {e}"))?;
    let metadata = transcript::build_transcript_edit_metadata(&transcript_id, &source);
    let record = artifacts::store_bytes(
        &app,
        &profile_id,
        "transcript",
        "json",
        &transcript_bytes,
        &metadata,
    )?;

    Ok(TranscriptEditSaveResponse {
        transcript_id: record.id,
    })
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
pub fn asr_sidecar_status(app: tauri::AppHandle) -> Result<asr_sidecar::SidecarStatus, String> {
    asr_sidecar::resolve_sidecar_status(&app)
}

#[tauri::command]
pub fn asr_diagnostics_export(
    app: tauri::AppHandle,
) -> Result<AsrDiagnosticsExportResponse, String> {
    let bundle = asr::build_diagnostics_bundle(&app, &KNOWN_ASR_ERROR_SIGNATURES)?;
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let diagnostics_dir = app_data_dir.join("diagnostics").join("asr");
    std::fs::create_dir_all(&diagnostics_dir).map_err(|e| format!("diagnostics_dir: {e}"))?;
    let timestamp = chrono::Utc::now().format("%Y%m%dT%H%M%SZ");
    let output_path = diagnostics_dir.join(format!("asr-diagnostics-{timestamp}.json"));
    let payload =
        serde_json::to_string_pretty(&bundle).map_err(|e| format!("diagnostics_json: {e}"))?;
    std::fs::write(&output_path, payload).map_err(|e| format!("diagnostics_write: {e}"))?;
    Ok(AsrDiagnosticsExportResponse {
        path: output_path.to_string_lossy().to_string(),
    })
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
    crate::commands::assert_valid_event_name(EVENT_MODEL_DOWNLOAD_PROGRESS);
    tauri::async_runtime::spawn_blocking(move || {
        asr::download_model_blocking(&app_handle, &model_id_clone, |downloaded, total| {
            let _ = emit_model_download_progress(&app_handle, &model_id_clone, downloaded, total);
        })
    })
    .await
    .map_err(|e| format!("download_join: {e}"))?
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

#[cfg(test)]
mod transcription_tests {
    use super::*;
    use std::path::PathBuf;

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
        let (samples, duration_ms) = asr::decode_wav_mono_16k(&bytes).expect("decode wav");
        assert!(!samples.is_empty());
        assert!(duration_ms > 0);
    }

    #[test]
    fn decode_wav_rejects_wrong_rate() {
        let mut bytes = fixture_bytes();
        bytes[24..28].copy_from_slice(&8000u32.to_le_bytes());
        let err = asr::decode_wav_mono_16k(&bytes).expect_err("should fail");
        assert_eq!(err, "wav_sample_rate");
    }

    #[test]
    fn decode_wav_rejects_short_header() {
        let bytes = vec![0u8; 10];
        let err = asr::decode_wav_mono_16k(&bytes).expect_err("should fail");
        assert_eq!(err, "wav_header");
    }

    #[test]
    fn decode_wav_rejects_non_pcm() {
        let mut bytes = fixture_bytes();
        bytes[20..22].copy_from_slice(&3u16.to_le_bytes());
        let err = asr::decode_wav_mono_16k(&bytes).expect_err("should fail");
        assert_eq!(err, "wav_format");
    }

    #[test]
    fn decode_wav_rejects_stereo() {
        let mut bytes = fixture_bytes();
        bytes[22..24].copy_from_slice(&2u16.to_le_bytes());
        let err = asr::decode_wav_mono_16k(&bytes).expect_err("should fail");
        assert_eq!(err, "wav_format");
    }

    #[test]
    fn decode_wav_rejects_bad_data_size() {
        let mut bytes = fixture_bytes();
        let inflated = (bytes.len() as u32) + 1024;
        bytes[40..44].copy_from_slice(&inflated.to_le_bytes());
        let err = asr::decode_wav_mono_16k(&bytes).expect_err("should fail");
        assert_eq!(err, "wav_data");
    }

    #[test]
    fn transcript_edit_metadata_includes_source_link_fields() {
        let source = models::TranscriptV1 {
            schema_version: "1.0.0".to_string(),
            language: "fr".to_string(),
            model_id: Some("tiny".to_string()),
            duration_ms: Some(3210),
            segments: vec![models::TranscriptSegment {
                t_start_ms: 0,
                t_end_ms: 3210,
                text: "bonjour".to_string(),
                confidence: Some(0.8),
            }],
        };

        let metadata = transcript::build_transcript_edit_metadata("tr-source-1", &source);
        assert_eq!(metadata["source_transcript_id"], "tr-source-1");
        assert_eq!(metadata["edit_kind"], "manual");
        assert_eq!(metadata["source_language"], "fr");
        assert_eq!(metadata["source_model_id"], "tiny");
        assert_eq!(metadata["source_duration_ms"], 3210);
        assert!(metadata
            .get("edited_at")
            .and_then(|value| value.as_str())
            .is_some());
    }
}
