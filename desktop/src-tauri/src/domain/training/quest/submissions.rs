use super::repo;
use crate::kernel::{ids, time};
use crate::platform::artifacts;
use crate::platform::db;

pub fn quest_submit_text(
    app: &tauri::AppHandle,
    profile_id: &str,
    project_id: &str,
    quest_code: &str,
    text: &str,
) -> Result<String, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let id = ids::new_id("att");
    let now = time::now_rfc3339();

    repo::insert_text_attempt(&conn, &id, project_id, quest_code, &now, text)?;
    Ok(id)
}

pub fn quest_submit_audio(
    app: &tauri::AppHandle,
    profile_id: &str,
    project_id: &str,
    quest_code: &str,
    audio_artifact_id: &str,
    transcript_id: Option<String>,
) -> Result<String, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;

    repo::ensure_quest_exists(&conn, quest_code)?;
    ensure_audio_artifact(app, profile_id, audio_artifact_id)?;
    if let Some(ref transcript_id) = transcript_id {
        ensure_transcript_artifact(app, profile_id, transcript_id)?;
    }

    let existing = repo::select_attempt_by_audio(&conn, audio_artifact_id)?;
    if let Some((attempt_id, existing_transcript_id)) = existing {
        if transcript_id.is_some() && transcript_id != existing_transcript_id {
            repo::update_attempt_transcript(&conn, &attempt_id, transcript_id.as_deref())?;
        }
        return Ok(attempt_id);
    }

    let id = ids::new_id("att");
    let now = time::now_rfc3339();
    repo::insert_audio_attempt(
        &conn,
        &id,
        project_id,
        quest_code,
        &now,
        audio_artifact_id,
        transcript_id.as_deref(),
    )?;

    Ok(id)
}

fn ensure_audio_artifact(
    app: &tauri::AppHandle,
    profile_id: &str,
    artifact_id: &str,
) -> Result<(), String> {
    let artifact = artifacts::get_artifact(app, profile_id, artifact_id)?;
    if artifact.artifact_type != "audio" {
        return Err("artifact_not_audio".to_string());
    }
    Ok(())
}

fn ensure_transcript_artifact(
    app: &tauri::AppHandle,
    profile_id: &str,
    artifact_id: &str,
) -> Result<(), String> {
    let artifact = artifacts::get_artifact(app, profile_id, artifact_id)?;
    if artifact.artifact_type != "transcript" {
        return Err("artifact_not_transcript".to_string());
    }
    Ok(())
}
