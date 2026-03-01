use super::super::queries;
use super::super::types::TalksBlueprintSource;
use rusqlite::{params, Connection, OptionalExtension};

pub(in crate::domain::coach) fn load_talks_blueprint_source(
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
