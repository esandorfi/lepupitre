use super::analysis;
use super::repo;
use super::types::AnalyzeResponse;
use crate::domain::asr::transcript;
use crate::kernel::{ids, time};
use crate::platform::artifacts;
use crate::platform::db;

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
