use crate::core::{analysis, artifacts, db, ids, time, transcript};
use rusqlite::{params, OptionalExtension};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct RunSummary {
    pub id: String,
    pub project_id: String,
    pub created_at: String,
    pub audio_artifact_id: Option<String>,
    pub transcript_id: Option<String>,
    pub feedback_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunAnalyzeResponse {
    pub feedback_id: String,
}

#[tauri::command]
pub fn run_create(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<String, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    ensure_project_exists(&conn, &project_id)?;

    let id = ids::new_id("run");
    let now = time::now_rfc3339();

    conn.execute(
        "INSERT INTO runs (id, project_id, created_at) VALUES (?1, ?2, ?3)",
        params![id, project_id, now],
    )
    .map_err(|e| format!("run_insert: {e}"))?;

    Ok(id)
}

#[tauri::command]
pub fn run_finish(
    app: tauri::AppHandle,
    profile_id: String,
    run_id: String,
    audio_artifact_id: String,
) -> Result<(), String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    ensure_audio_artifact(&app, &profile_id, &audio_artifact_id)?;

    let updated = conn
        .execute(
            "UPDATE runs SET audio_artifact_id = ?1 WHERE id = ?2",
            params![audio_artifact_id, run_id],
        )
        .map_err(|e| format!("run_finish: {e}"))?;
    if updated == 0 {
        return Err("run_not_found".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn run_set_transcript(
    app: tauri::AppHandle,
    profile_id: String,
    run_id: String,
    transcript_id: String,
) -> Result<(), String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    ensure_transcript_artifact(&app, &profile_id, &transcript_id)?;

    let updated = conn
        .execute(
            "UPDATE runs SET transcript_id = ?1 WHERE id = ?2",
            params![transcript_id, run_id],
        )
        .map_err(|e| format!("run_transcript: {e}"))?;
    if updated == 0 {
        return Err("run_not_found".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn run_get_latest(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<Option<RunSummary>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id
             FROM runs
             WHERE project_id = ?1
             ORDER BY created_at DESC
             LIMIT 1",
        )
        .map_err(|e| format!("run_latest_prepare: {e}"))?;

    let run = stmt
        .query_row(params![project_id], |row| {
            Ok(RunSummary {
                id: row.get(0)?,
                project_id: row.get(1)?,
                created_at: row.get(2)?,
                audio_artifact_id: row.get(3)?,
                transcript_id: row.get(4)?,
                feedback_id: row.get(5)?,
            })
        })
        .optional()
        .map_err(|e| format!("run_latest_lookup: {e}"))?;

    Ok(run)
}

#[tauri::command]
pub fn run_get(
    app: tauri::AppHandle,
    profile_id: String,
    run_id: String,
) -> Result<Option<RunSummary>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let run = conn
        .query_row(
            "SELECT id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id
             FROM runs
             WHERE id = ?1",
            params![run_id],
            |row| {
                Ok(RunSummary {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    created_at: row.get(2)?,
                    audio_artifact_id: row.get(3)?,
                    transcript_id: row.get(4)?,
                    feedback_id: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|e| format!("run_lookup: {e}"))?;

    Ok(run)
}

#[tauri::command]
pub fn run_list(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    limit: Option<u32>,
) -> Result<Vec<RunSummary>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let limit = limit.unwrap_or(12).max(1) as i64;

    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id
             FROM runs
             WHERE project_id = ?1
             ORDER BY created_at DESC
             LIMIT ?2",
        )
        .map_err(|e| format!("run_list_prepare: {e}"))?;
    let rows = stmt
        .query_map(params![project_id, limit], |row| {
            Ok(RunSummary {
                id: row.get(0)?,
                project_id: row.get(1)?,
                created_at: row.get(2)?,
                audio_artifact_id: row.get(3)?,
                transcript_id: row.get(4)?,
                feedback_id: row.get(5)?,
            })
        })
        .map_err(|e| format!("run_list_query: {e}"))?;

    let mut runs = Vec::new();
    for row in rows {
        runs.push(row.map_err(|e| format!("run_list_row: {e}"))?);
    }
    Ok(runs)
}

#[tauri::command]
pub fn run_analyze(
    app: tauri::AppHandle,
    profile_id: String,
    run_id: String,
) -> Result<RunAnalyzeResponse, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let mut conn = db::open_profile(&app, &profile_id)?;

    let (transcript_id, existing_feedback_id): (Option<String>, Option<String>) = conn
        .query_row(
            "SELECT transcript_id, feedback_id FROM runs WHERE id = ?1",
            params![run_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("run_lookup: {e}"))?;

    if let Some(feedback_id) = existing_feedback_id {
        return Ok(RunAnalyzeResponse { feedback_id });
    }

    let transcript_id = transcript_id.ok_or_else(|| "run_missing_transcript".to_string())?;
    let transcript = transcript::load_transcript(&app, &profile_id, &transcript_id)?;
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
        &app,
        &profile_id,
        "feedback",
        "json",
        &feedback_json,
        &metadata,
    )?;

    let feedback_id = ids::new_id("fb");
    let now = time::now_rfc3339();
    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    tx.execute(
        "INSERT INTO auto_feedback (id, subject_type, subject_id, created_at, feedback_json_artifact_id, overall_score)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            feedback_id,
            "run",
            run_id,
            now,
            record.id,
            feedback.overall_score
        ],
    )
    .map_err(|e| format!("feedback_insert: {e}"))?;
    tx.execute(
        "UPDATE runs SET feedback_id = ?1 WHERE id = ?2",
        params![feedback_id, run_id],
    )
    .map_err(|e| format!("run_update: {e}"))?;
    tx.commit().map_err(|e| format!("commit: {e}"))?;

    Ok(RunAnalyzeResponse { feedback_id })
}

fn ensure_project_exists(conn: &rusqlite::Connection, project_id: &str) -> Result<(), String> {
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM talk_projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("project_check: {e}"))?;
    if exists == 0 {
        return Err("project_not_found".to_string());
    }
    Ok(())
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
