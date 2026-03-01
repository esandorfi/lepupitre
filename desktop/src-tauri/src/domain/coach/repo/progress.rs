use super::super::queries;
use super::super::types::ProgressStats;
use chrono::NaiveDate;
use rusqlite::{params, Connection, OptionalExtension};

pub(in crate::domain::coach) fn resolve_project_id(
    conn: &Connection,
    requested_project_id: Option<&str>,
) -> Result<String, String> {
    if let Some(project_id) = requested_project_id {
        let exists: i64 = conn
            .query_row(queries::SELECT_PROJECT_EXISTS, params![project_id], |row| {
                row.get(0)
            })
            .map_err(|e| format!("progress_project_exists: {e}"))?;
        if exists == 0 {
            return Err("project_not_found".to_string());
        }
        return Ok(project_id.to_string());
    }

    let training_project_id = conn
        .query_row(queries::SELECT_TRAINING_PROJECT, [], |row| {
            row.get::<_, String>(0)
        })
        .optional()
        .map_err(|e| format!("progress_training_project: {e}"))?;
    if let Some(project_id) = training_project_id {
        return Ok(project_id);
    }

    let active_project_id = conn
        .query_row(queries::SELECT_ACTIVE_PROJECT, [], |row| {
            row.get::<_, Option<String>>(0)
        })
        .optional()
        .map_err(|e| format!("progress_active_project: {e}"))?
        .flatten();
    if let Some(project_id) = active_project_id {
        return Ok(project_id);
    }

    Err("project_not_found".to_string())
}

pub(in crate::domain::coach) fn load_progress_stats(
    conn: &Connection,
    project_id: &str,
    weekly_cutoff: &str,
) -> Result<ProgressStats, String> {
    let attempts_total: i64 = conn
        .query_row(
            queries::SELECT_PROGRESS_ATTEMPTS_COUNT,
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("progress_attempts_total: {e}"))?;

    let feedback_ready_total: i64 = conn
        .query_row(
            queries::SELECT_PROGRESS_FEEDBACK_COUNT,
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("progress_feedback_total: {e}"))?;

    let last_attempt_at: Option<String> = conn
        .query_row(
            queries::SELECT_PROGRESS_LAST_ATTEMPT,
            params![project_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("progress_last_attempt: {e}"))?
        .flatten();

    let weekly_completed: i64 = conn
        .query_row(
            queries::SELECT_PROGRESS_WEEKLY_COMPLETED,
            params![project_id, weekly_cutoff],
            |row| row.get(0),
        )
        .map_err(|e| format!("progress_weekly_completed: {e}"))?;

    Ok(ProgressStats {
        attempts_total,
        feedback_ready_total,
        weekly_completed,
        last_attempt_at,
    })
}

pub(in crate::domain::coach) fn load_streak_days(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<NaiveDate>, String> {
    let mut stmt = conn
        .prepare(queries::SELECT_STREAK_DAYS)
        .map_err(|e| format!("progress_streak_prepare: {e}"))?;
    let rows = stmt
        .query_map(params![project_id], |row| row.get::<_, String>(0))
        .map_err(|e| format!("progress_streak_query: {e}"))?;

    let mut days = Vec::new();
    for row in rows {
        let day = row.map_err(|e| format!("progress_streak_row: {e}"))?;
        if let Ok(parsed) = NaiveDate::parse_from_str(&day, "%Y-%m-%d") {
            days.push(parsed);
        }
    }
    Ok(days)
}
