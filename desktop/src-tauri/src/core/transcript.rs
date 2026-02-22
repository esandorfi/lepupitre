use crate::core::{artifacts, db, models};

pub fn load_transcript(
    app: &tauri::AppHandle,
    profile_id: &str,
    transcript_id: &str,
) -> Result<models::TranscriptV1, String> {
    let artifact = artifacts::get_artifact(app, profile_id, transcript_id)?;
    if artifact.artifact_type != "transcript" {
        return Err("artifact_not_transcript".to_string());
    }
    let profile_dir = db::profile_dir(app, profile_id)?;
    let transcript_path = profile_dir.join(&artifact.relpath);
    let bytes = std::fs::read(&transcript_path).map_err(|e| format!("transcript_read: {e}"))?;
    serde_json::from_slice(&bytes).map_err(|e| format!("transcript_parse: {e}"))
}

pub fn transcript_text(transcript: &models::TranscriptV1) -> Result<String, String> {
    let text = transcript
        .segments
        .iter()
        .map(|segment| segment.text.trim())
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<&str>>()
        .join(" ");
    if text.is_empty() {
        return Err("transcript_empty".to_string());
    }
    Ok(text)
}

pub fn transcript_duration_ms(transcript: &models::TranscriptV1) -> Option<i64> {
    transcript
        .segments
        .iter()
        .map(|segment| segment.t_end_ms)
        .max()
}
