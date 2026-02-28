use crate::core::run::queries;
use crate::core::run::types::RunSummary;
use rusqlite::{params, Connection, ErrorCode, OptionalExtension, Row};

pub(super) fn insert_run(
    conn: &Connection,
    run_id: &str,
    project_id: &str,
    created_at: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(queries::INSERT_RUN, params![run_id, project_id, created_at])?;
    Ok(())
}

pub(super) fn update_run_audio(
    conn: &Connection,
    run_id: &str,
    audio_artifact_id: &str,
) -> Result<usize, String> {
    conn.execute(
        queries::UPDATE_RUN_AUDIO,
        params![audio_artifact_id, run_id],
    )
    .map_err(|e| format!("run_finish: {e}"))
}

pub(super) fn update_run_transcript(
    conn: &Connection,
    run_id: &str,
    transcript_id: &str,
) -> Result<usize, String> {
    conn.execute(
        queries::UPDATE_RUN_TRANSCRIPT,
        params![transcript_id, run_id],
    )
    .map_err(|e| format!("run_transcript: {e}"))
}

pub(super) fn select_latest_run(
    conn: &Connection,
    project_id: &str,
) -> Result<Option<RunSummary>, String> {
    let mut stmt = conn
        .prepare(queries::SELECT_LATEST_RUN)
        .map_err(|e| format!("run_latest_prepare: {e}"))?;
    stmt.query_row(params![project_id], row_to_run)
        .optional()
        .map_err(|e| format!("run_latest_lookup: {e}"))
}

pub(super) fn select_run(conn: &Connection, run_id: &str) -> Result<Option<RunSummary>, String> {
    conn.query_row(queries::SELECT_RUN_BY_ID, params![run_id], row_to_run)
        .optional()
        .map_err(|e| format!("run_lookup: {e}"))
}

pub(super) fn select_runs(
    conn: &Connection,
    project_id: &str,
    limit: i64,
) -> Result<Vec<RunSummary>, String> {
    let mut stmt = conn
        .prepare(queries::SELECT_RUNS_BY_PROJECT)
        .map_err(|e| format!("run_list_prepare: {e}"))?;
    let rows = stmt
        .query_map(params![project_id, limit], row_to_run)
        .map_err(|e| format!("run_list_query: {e}"))?;

    let mut runs = Vec::new();
    for row in rows {
        runs.push(row.map_err(|e| format!("run_list_row: {e}"))?);
    }
    Ok(runs)
}

pub(super) fn select_run_analysis_state(
    conn: &Connection,
    run_id: &str,
) -> Result<(Option<String>, Option<String>), String> {
    conn.query_row(queries::SELECT_RUN_ANALYSIS_STATE, params![run_id], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })
    .map_err(|e| format!("run_lookup: {e}"))
}

pub(super) fn persist_run_feedback_link(
    conn: &mut Connection,
    feedback_id: &str,
    run_id: &str,
    feedback_artifact_id: &str,
    overall_score: i64,
    now: &str,
) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    tx.execute(
        queries::INSERT_RUN_FEEDBACK,
        params![
            feedback_id,
            "run",
            run_id,
            now,
            feedback_artifact_id,
            overall_score
        ],
    )
    .map_err(|e| format!("feedback_insert: {e}"))?;
    let updated = tx
        .execute(
            queries::UPDATE_RUN_FEEDBACK_LINK,
            params![feedback_id, run_id],
        )
        .map_err(|e| format!("run_update: {e}"))?;
    if updated == 0 {
        return Err("run_update_missing".to_string());
    }
    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(())
}

pub(super) fn ensure_project_exists(conn: &Connection, project_id: &str) -> Result<(), String> {
    let exists: i64 = conn
        .query_row(queries::SELECT_PROJECT_EXISTS, params![project_id], |row| {
            row.get(0)
        })
        .map_err(|e| format!("project_check: {e}"))?;
    if exists == 0 {
        return Err("project_not_found".to_string());
    }
    Ok(())
}

pub(super) fn is_audio_notnull_error(err: &rusqlite::Error) -> bool {
    match err {
        rusqlite::Error::SqliteFailure(e, msg) => {
            matches!(e.code, ErrorCode::ConstraintViolation)
                && msg
                    .as_deref()
                    .unwrap_or_default()
                    .contains("runs.audio_artifact_id")
        }
        _ => false,
    }
}

fn row_to_run(row: &Row<'_>) -> rusqlite::Result<RunSummary> {
    Ok(RunSummary {
        id: row.get(0)?,
        project_id: row.get(1)?,
        created_at: row.get(2)?,
        audio_artifact_id: row.get(3)?,
        transcript_id: row.get(4)?,
        feedback_id: row.get(5)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn persist_run_feedback_link_rolls_back_when_run_missing() {
        let mut conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "CREATE TABLE runs (
               id TEXT PRIMARY KEY,
               project_id TEXT NOT NULL,
               created_at TEXT NOT NULL,
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

        let err = persist_run_feedback_link(
            &mut conn,
            "fb_missing",
            "run_missing",
            "artifact_fb",
            55,
            "2026-02-28T00:00:00Z",
        )
        .expect_err("missing run");
        assert_eq!(err, "run_update_missing");

        let feedback_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM auto_feedback", [], |row| row.get(0))
            .expect("count");
        assert_eq!(feedback_count, 0);
    }
}
