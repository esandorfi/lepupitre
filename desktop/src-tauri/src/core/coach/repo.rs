use crate::core::coach::queries;
use crate::core::coach::types::{ProgressStats, TalksBlueprintSource};
use chrono::NaiveDate;
use rusqlite::{params, Connection, OptionalExtension};

pub(super) fn resolve_project_id(
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

pub(super) fn load_progress_stats(
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

pub(super) fn load_streak_days(
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

pub(super) fn load_talks_blueprint_source(
    conn: &Connection,
    project_id: &str,
) -> Result<TalksBlueprintSource, String> {
    let project = conn
        .query_row(
            queries::SELECT_PROJECT_FOR_BLUEPRINT,
            params![project_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<i64>>(4)?,
                    row.get::<_, String>(5)?,
                ))
            },
        )
        .map_err(|e| format!("talks_blueprint_project_lookup: {e}"))?;

    let outline_len: i64 = conn
        .query_row(
            queries::SELECT_OUTLINE_LENGTH,
            params![project.0.as_str()],
            |row| row.get::<_, Option<i64>>(0),
        )
        .optional()
        .map_err(|e| format!("talks_blueprint_outline_lookup: {e}"))?
        .flatten()
        .unwrap_or(0);

    let quest_attempts: i64 = conn
        .query_row(
            queries::SELECT_QUEST_ATTEMPTS_COUNT,
            params![project.0.as_str()],
            |row| row.get(0),
        )
        .map_err(|e| format!("talks_blueprint_attempts_lookup: {e}"))?;
    let runs_total: i64 = conn
        .query_row(
            queries::SELECT_RUNS_COUNT,
            params![project.0.as_str()],
            |row| row.get(0),
        )
        .map_err(|e| format!("talks_blueprint_runs_lookup: {e}"))?;
    let quest_feedback: i64 = conn
        .query_row(
            queries::SELECT_QUEST_FEEDBACK_COUNT,
            params![project.0.as_str()],
            |row| row.get(0),
        )
        .map_err(|e| format!("talks_blueprint_quest_feedback_lookup: {e}"))?;
    let run_feedback: i64 = conn
        .query_row(
            queries::SELECT_RUN_FEEDBACK_COUNT,
            params![project.0.as_str()],
            |row| row.get(0),
        )
        .map_err(|e| format!("talks_blueprint_run_feedback_lookup: {e}"))?;

    Ok(TalksBlueprintSource {
        project_id: project.0,
        project_title: project.1,
        audience: project.2,
        goal: project.3,
        duration_target_sec: project.4,
        stage: project.5,
        outline_len,
        quest_attempts,
        runs_total,
        quest_feedback,
        run_feedback,
    })
}
