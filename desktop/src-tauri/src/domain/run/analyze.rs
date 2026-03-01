use super::repo;
use super::types::RunAnalyzeResponse;
use crate::domain::asr::transcript;
use crate::domain::feedback::analysis;
use crate::kernel::{ids, time};
use crate::platform::artifacts;
use crate::platform::db;
use tauri::AppHandle;

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
