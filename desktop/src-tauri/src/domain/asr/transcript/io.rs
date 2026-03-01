use crate::kernel::models;
use crate::platform::artifacts;

pub fn load_transcript(
    app: &tauri::AppHandle,
    profile_id: &str,
    transcript_id: &str,
) -> Result<models::TranscriptV1, String> {
    let artifact = artifacts::get_artifact(app, profile_id, transcript_id)?;
    if artifact.artifact_type != "transcript" {
        return Err("artifact_not_transcript".to_string());
    }
    let transcript_path =
        artifacts::resolve_profile_relpath_for_read(app, profile_id, &artifact.relpath)?;
    let bytes = std::fs::read(&transcript_path).map_err(|e| format!("transcript_read: {e}"))?;
    serde_json::from_slice(&bytes).map_err(|e| format!("transcript_parse: {e}"))
}
