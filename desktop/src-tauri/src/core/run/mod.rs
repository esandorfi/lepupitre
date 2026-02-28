mod queries;
mod repo;
mod types;

use crate::core::{analysis, artifacts, db, ids, time, transcript};
use tauri::AppHandle;

pub use types::{RunAnalyzeResponse, RunSummary};

pub fn run_create(app: &AppHandle, profile_id: &str, project_id: &str) -> Result<String, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let mut conn = db::open_profile(app, profile_id)?;
    repo::ensure_project_exists(&conn, project_id)?;

    let id = ids::new_id("run");
    let now = time::now_rfc3339();

    let insert = repo::insert_run(&conn, &id, project_id, &now);
    if let Err(err) = insert {
        if repo::is_audio_notnull_error(&err) {
            db::ensure_runs_nullable(&mut conn)?;
            repo::insert_run(&conn, &id, project_id, &now)
                .map_err(|e| format!("run_insert: {e}"))?;
        } else {
            return Err(format!("run_insert: {err}"));
        }
    }

    Ok(id)
}

pub fn run_finish(
    app: &AppHandle,
    profile_id: &str,
    run_id: &str,
    audio_artifact_id: &str,
) -> Result<(), String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    ensure_audio_artifact(app, profile_id, audio_artifact_id)?;

    let updated = repo::update_run_audio(&conn, run_id, audio_artifact_id)?;
    if updated == 0 {
        return Err("run_not_found".to_string());
    }
    Ok(())
}

pub fn run_set_transcript(
    app: &AppHandle,
    profile_id: &str,
    run_id: &str,
    transcript_id: &str,
) -> Result<(), String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    ensure_transcript_artifact(app, profile_id, transcript_id)?;

    let updated = repo::update_run_transcript(&conn, run_id, transcript_id)?;
    if updated == 0 {
        return Err("run_not_found".to_string());
    }
    Ok(())
}

pub fn run_get_latest(
    app: &AppHandle,
    profile_id: &str,
    project_id: &str,
) -> Result<Option<RunSummary>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::select_latest_run(&conn, project_id)
}

pub fn run_get(
    app: &AppHandle,
    profile_id: &str,
    run_id: &str,
) -> Result<Option<RunSummary>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::select_run(&conn, run_id)
}

pub fn run_list(
    app: &AppHandle,
    profile_id: &str,
    project_id: &str,
    limit: Option<u32>,
) -> Result<Vec<RunSummary>, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let limit = limit.unwrap_or(12).max(1) as i64;
    repo::select_runs(&conn, project_id, limit)
}

pub fn run_analyze(
    app: &AppHandle,
    profile_id: &str,
    run_id: &str,
) -> Result<RunAnalyzeResponse, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let mut conn = db::open_profile(app, profile_id)?;

    let (transcript_id, existing_feedback_id) = repo::select_run_analysis_state(&conn, run_id)?;
    if let Some(feedback_id) = existing_feedback_id {
        return Ok(RunAnalyzeResponse { feedback_id });
    }

    let transcript_id = transcript_id.ok_or_else(|| "run_missing_transcript".to_string())?;
    let transcript = transcript::load_transcript(app, profile_id, &transcript_id)?;
    let text = transcript::transcript_text(&transcript)?;
    let estimated_sec = transcript::transcript_duration_ms(&transcript)
        .and_then(|ms| {
            if ms > 0 {
                Some(((ms as f64) / 1000.0).ceil() as i64)
            } else {
                None
            }
        })
        .unwrap_or(600);

    let feedback = analysis::build_feedback_from_text(&text, estimated_sec);
    let feedback_json = serde_json::to_vec(&feedback).map_err(|e| format!("feedback_json: {e}"))?;
    let metadata = serde_json::json!({
        "source": "transcript",
        "run_id": run_id,
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
    let persist_result = repo::persist_run_feedback_link(
        &mut conn,
        &feedback_id,
        run_id,
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

    Ok(RunAnalyzeResponse { feedback_id })
}

fn ensure_audio_artifact(
    app: &AppHandle,
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
    app: &AppHandle,
    profile_id: &str,
    artifact_id: &str,
) -> Result<(), String> {
    let artifact = artifacts::get_artifact(app, profile_id, artifact_id)?;
    if artifact.artifact_type != "transcript" {
        return Err("artifact_not_transcript".to_string());
    }
    Ok(())
}
