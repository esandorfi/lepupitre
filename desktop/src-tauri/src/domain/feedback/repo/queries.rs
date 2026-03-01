use super::super::types::FeedbackTimelineItem;
use rusqlite::{params, Connection, OptionalExtension};

pub fn ensure_project_exists(conn: &Connection, project_id: &str) -> Result<(), String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM talk_projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("project_exists: {e}"))?;
    if count == 0 {
        return Err("project_not_found".to_string());
    }
    Ok(())
}

pub fn select_feedback_timeline(
    conn: &Connection,
    project_id: Option<&str>,
    limit: i64,
) -> Result<Vec<FeedbackTimelineItem>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT af.id, af.created_at, af.overall_score, af.subject_type,
                    COALESCE(qa.project_id, r.project_id) AS project_id,
                    qa.quest_code, q.title, r.id, fn.updated_at
             FROM auto_feedback af
             LEFT JOIN quest_attempts qa
               ON af.subject_type = 'quest_attempt' AND qa.id = af.subject_id
             LEFT JOIN quests q ON qa.quest_code = q.code
             LEFT JOIN runs r
               ON af.subject_type = 'run' AND r.id = af.subject_id
             LEFT JOIN feedback_notes fn ON fn.feedback_id = af.id
             WHERE af.subject_type IN ('quest_attempt', 'run')
               AND COALESCE(qa.project_id, r.project_id) IS NOT NULL
               AND (?1 IS NULL OR COALESCE(qa.project_id, r.project_id) = ?1)
             ORDER BY af.created_at DESC
             LIMIT ?2",
        )
        .map_err(|e| format!("feedback_timeline_prepare: {e}"))?;
    let rows = stmt
        .query_map(params![project_id, limit], |row| {
            Ok(FeedbackTimelineItem {
                id: row.get(0)?,
                created_at: row.get(1)?,
                overall_score: row.get(2)?,
                subject_type: row.get(3)?,
                project_id: row.get(4)?,
                quest_code: row.get(5)?,
                quest_title: row.get(6)?,
                run_id: row.get(7)?,
                note_updated_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("feedback_timeline_query: {e}"))?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| format!("feedback_timeline_row: {e}"))?);
    }
    Ok(items)
}

pub fn select_attempt_input(
    conn: &Connection,
    attempt_id: &str,
) -> Result<(Option<String>, Option<String>, i64), String> {
    conn.query_row(
        "SELECT qa.output_text, qa.transcript_id, q.estimated_sec
         FROM quest_attempts qa
         JOIN quests q ON qa.quest_code = q.code
         WHERE qa.id = ?1",
        [attempt_id],
        |row| {
            Ok((
                row.get::<_, Option<String>>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, i64>(2)?,
            ))
        },
    )
    .map_err(|e| format!("attempt_lookup: {e}"))
}

pub fn select_feedback_artifact_id(conn: &Connection, feedback_id: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT feedback_json_artifact_id FROM auto_feedback WHERE id = ?1",
        [feedback_id],
        |row| row.get(0),
    )
    .map_err(|e| format!("feedback_lookup: {e}"))
}

pub fn select_feedback_subject(
    conn: &Connection,
    feedback_id: &str,
) -> Result<(String, String), String> {
    conn.query_row(
        "SELECT subject_type, subject_id FROM auto_feedback WHERE id = ?1",
        [feedback_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .map_err(|e| format!("feedback_lookup: {e}"))
}

pub fn select_quest_attempt_context(
    conn: &Connection,
    attempt_id: &str,
) -> Result<(String, String, String, String), String> {
    conn.query_row(
        "SELECT qa.id, qa.project_id, qa.quest_code, q.title
         FROM quest_attempts qa
         JOIN quests q ON qa.quest_code = q.code
         WHERE qa.id = ?1",
        [attempt_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    )
    .map_err(|e| format!("attempt_lookup: {e}"))
}

pub fn select_run_project_id(conn: &Connection, run_id: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT project_id FROM runs WHERE id = ?1",
        [run_id],
        |row| row.get(0),
    )
    .map_err(|e| format!("run_lookup: {e}"))
}

pub fn select_feedback_note(
    conn: &Connection,
    feedback_id: &str,
) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT note_text FROM feedback_notes WHERE feedback_id = ?1",
        [feedback_id],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| format!("note_lookup: {e}"))
}

pub fn feedback_exists(conn: &Connection, feedback_id: &str) -> Result<bool, String> {
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM auto_feedback WHERE id = ?1",
            [feedback_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("feedback_check: {e}"))?;
    Ok(exists > 0)
}
