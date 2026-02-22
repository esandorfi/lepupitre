use crate::core::{artifacts, db, ids, models, transcript};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

const EVENT_JOB_PROGRESS: &str = "job:progress";
const EVENT_JOB_COMPLETED: &str = "job:completed";
const EVENT_JOB_FAILED: &str = "job:failed";
const EVENT_ASR_FINAL_PROGRESS: &str = "asr/final_progress/v1";
const EVENT_ASR_FINAL_RESULT: &str = "asr/final_result/v1";

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
