use super::super::queries;
use super::super::types::RunSummary;
use rusqlite::{params, Connection, ErrorCode, OptionalExtension, Row};

pub(in crate::domain::run) fn select_latest_run(
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

pub(in crate::domain::run) fn select_run(
    conn: &Connection,
    run_id: &str,
) -> Result<Option<RunSummary>, String> {
    conn.query_row(queries::SELECT_RUN_BY_ID, params![run_id], row_to_run)
        .optional()
        .map_err(|e| format!("run_lookup: {e}"))
}

pub(in crate::domain::run) fn select_runs(
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

pub(in crate::domain::run) fn select_run_analysis_state(
    conn: &Connection,
    run_id: &str,
) -> Result<(Option<String>, Option<String>), String> {
    conn.query_row(queries::SELECT_RUN_ANALYSIS_STATE, params![run_id], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })
    .map_err(|e| format!("run_lookup: {e}"))
}

pub(in crate::domain::run) fn ensure_project_exists(
    conn: &Connection,
    project_id: &str,
) -> Result<(), String> {
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

pub(in crate::domain::run) fn is_audio_notnull_error(err: &rusqlite::Error) -> bool {
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
