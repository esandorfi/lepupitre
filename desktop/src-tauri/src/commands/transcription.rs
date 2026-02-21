use crate::core::{artifacts, db, ids, models};
use serde::Serialize;
use tauri::Emitter;

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
    let artifact = artifacts::get_artifact(&app, &profile_id, &transcript_id)?;
    if artifact.artifact_type != "transcript" {
        return Err("artifact_not_transcript".to_string());
    }
    let profile_dir = db::profile_dir(&app, &profile_id)?;
    let transcript_path = profile_dir.join(&artifact.relpath);
    let bytes = std::fs::read(&transcript_path).map_err(|e| format!("transcript_read: {e}"))?;
    let transcript: models::TranscriptV1 =
        serde_json::from_slice(&bytes).map_err(|e| format!("transcript_parse: {e}"))?;
    Ok(transcript)
}

fn emit_progress(
    app: &tauri::AppHandle,
    job_id: &str,
    stage: &str,
    pct: u8,
    message: Option<String>,
) -> Result<(), String> {
    app.emit(
        "job_progress",
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
    app.emit(
        "job_completed",
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
    app.emit(
        "job_failed",
        JobFailedEvent {
            job_id: job_id.to_string(),
            error_code: error_code.to_string(),
            message: message.to_string(),
        },
    )
    .map_err(|e| format!("emit_failed: {e}"))?;
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
