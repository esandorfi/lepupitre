pub mod analysis;
mod repo;
mod types;

use crate::domain::asr::transcript;
use crate::kernel::models;
use crate::kernel::{ids, time};
use crate::platform::artifacts;
use crate::platform::db;

pub use types::{AnalyzeResponse, FeedbackContext, FeedbackTimelineItem};

pub fn feedback_timeline_list(
    app: &tauri::AppHandle,
    profile_id: &str,
    project_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<FeedbackTimelineItem>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let limit = normalize_timeline_limit(limit);

    if let Some(project_id) = project_id.as_ref() {
        repo::ensure_project_exists(&conn, project_id)?;
    }

    repo::select_feedback_timeline(&conn, project_id.as_deref(), limit)
}

pub fn analyze_attempt(
    app: &tauri::AppHandle,
    profile_id: &str,
    attempt_id: &str,
) -> Result<AnalyzeResponse, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let mut conn = db::open_profile(app, profile_id)?;

    let (output_text, transcript_id, estimated_sec) =
        repo::select_attempt_input(&conn, attempt_id)?;

    let mut source = "text";
    let text = if let Some(text) = output_text {
        text
    } else if let Some(transcript_id) = transcript_id {
        source = "transcript";
        let transcript = transcript::load_transcript(app, profile_id, &transcript_id)?;
        transcript::transcript_text(&transcript)?
    } else {
        return Err("attempt_missing_text".to_string());
    };

    let feedback = analysis::build_feedback_from_text(&text, estimated_sec);
    let feedback_json = serde_json::to_vec(&feedback).map_err(|e| format!("feedback_json: {e}"))?;
    let metadata = serde_json::json!({
        "source": source,
        "attempt_id": attempt_id,
    });

    let record = artifacts::store_bytes(
        app,
        profile_id,
        "feedback",
        "json",
        &feedback_json,
        &metadata,
    )?;

    let feedback_id = ids::new_id("fb");
    let now = time::now_rfc3339();
    let persist_result = repo::persist_attempt_feedback_link(
        &mut conn,
        &feedback_id,
        attempt_id,
        &record.id,
        feedback.overall_score,
        &now,
    );
    if let Err(persist_err) = persist_result {
        let cleanup_result = artifacts::delete_artifact(app, profile_id, &record.id);
        return match cleanup_result {
            Ok(()) => Err(persist_err),
            Err(cleanup_err) => Err(format!("{persist_err}; {cleanup_err}")),
        };
    }

    Ok(AnalyzeResponse { feedback_id })
}

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

pub fn feedback_note_get(
    app: &tauri::AppHandle,
    profile_id: &str,
    feedback_id: &str,
) -> Result<Option<String>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::select_feedback_note(&conn, feedback_id)
}

pub fn feedback_note_set(
    app: &tauri::AppHandle,
    profile_id: &str,
    feedback_id: &str,
    note: &str,
) -> Result<(), String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;

    if !repo::feedback_exists(&conn, feedback_id)? {
        return Err("feedback_not_found".to_string());
    }

    let trimmed = note.trim();
    if trimmed.is_empty() {
        repo::delete_feedback_note(&conn, feedback_id)?;
        return Ok(());
    }

    let now = time::now_rfc3339();
    repo::upsert_feedback_note(&conn, feedback_id, trimmed, &now)?;
    Ok(())
}

fn normalize_timeline_limit(limit: Option<u32>) -> i64 {
    let raw = limit.unwrap_or(30).max(1);
    raw.min(100) as i64
}

#[cfg(test)]
mod tests {
    use super::{normalize_timeline_limit, repo};
    use rusqlite::Connection;

    #[test]
    fn timeline_limit_defaults_to_thirty() {
        assert_eq!(normalize_timeline_limit(None), 30);
    }

    #[test]
    fn timeline_limit_clamps_bounds() {
        assert_eq!(normalize_timeline_limit(Some(0)), 1);
        assert_eq!(normalize_timeline_limit(Some(5)), 5);
        assert_eq!(normalize_timeline_limit(Some(300)), 100);
    }

    #[test]
    fn persist_attempt_feedback_link_rolls_back_when_attempt_missing() {
        let mut conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "CREATE TABLE quest_attempts (
               id TEXT PRIMARY KEY,
               project_id TEXT NOT NULL,
               quest_code TEXT NOT NULL,
               created_at TEXT NOT NULL,
               output_text TEXT,
               audio_artifact_id TEXT,
               transcript_id TEXT,
               feedback_id TEXT
             );
             CREATE TABLE auto_feedback (
               id TEXT PRIMARY KEY,
               subject_type TEXT NOT NULL,
               subject_id TEXT NOT NULL,
               created_at TEXT NOT NULL,
               feedback_json_artifact_id TEXT NOT NULL,
               overall_score INTEGER NOT NULL
             );",
        )
        .expect("schema");

        let err = repo::persist_attempt_feedback_link(
            &mut conn,
            "fb_missing",
            "att_missing",
            "artifact_fb",
            73,
            "2026-02-28T00:00:00Z",
        )
        .expect_err("missing attempt");
        assert_eq!(err, "attempt_update_missing");

        let feedback_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM auto_feedback", [], |row| row.get(0))
            .expect("count");
        assert_eq!(feedback_count, 0);
    }
}
