use super::repo;
use super::types::FeedbackContext;
use crate::kernel::models;
use crate::platform::artifacts;
use crate::platform::db;

pub fn feedback_get(
    app: &tauri::AppHandle,
    profile_id: &str,
    feedback_id: &str,
) -> Result<models::FeedbackV1, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let artifact_id = repo::select_feedback_artifact_id(&conn, feedback_id)?;

    let artifact = artifacts::get_artifact(app, profile_id, &artifact_id)?;
    if artifact.artifact_type != "feedback" {
        return Err("artifact_not_feedback".to_string());
    }
    let profile_dir = db::profile_dir(app, profile_id)?;
    let feedback_path = profile_dir.join(&artifact.relpath);
    let bytes = std::fs::read(&feedback_path).map_err(|e| format!("feedback_read: {e}"))?;
    let feedback: models::FeedbackV1 =
        serde_json::from_slice(&bytes).map_err(|e| format!("feedback_parse: {e}"))?;
    Ok(feedback)
}

pub fn feedback_context_get(
    app: &tauri::AppHandle,
    profile_id: &str,
    feedback_id: &str,
) -> Result<FeedbackContext, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;

    let (subject_type, subject_id) = repo::select_feedback_subject(&conn, feedback_id)?;

    if subject_type == "quest_attempt" {
        let (attempt_id, project_id, quest_code, quest_title) =
            repo::select_quest_attempt_context(&conn, &subject_id)?;

        return Ok(FeedbackContext {
            subject_type,
            subject_id: attempt_id,
            project_id,
            quest_code: Some(quest_code),
            quest_title: Some(quest_title),
            run_id: None,
        });
    }

    if subject_type == "run" {
        let project_id = repo::select_run_project_id(&conn, &subject_id)?;

        return Ok(FeedbackContext {
            subject_type,
            subject_id: subject_id.clone(),
            project_id,
            quest_code: None,
            quest_title: None,
            run_id: Some(subject_id),
        });
    }

    Err("feedback_subject_not_supported".to_string())
}
