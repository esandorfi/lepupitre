use crate::core::{analysis, artifacts, db, ids, models, time, transcript};
use rusqlite::{params, OptionalExtension};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeResponse {
    pub feedback_id: String,
}

#[derive(Debug, Serialize)]
pub struct FeedbackContext {
    pub subject_type: String,
    pub subject_id: String,
    pub project_id: String,
    pub quest_code: Option<String>,
    pub quest_title: Option<String>,
    pub run_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FeedbackTimelineItem {
    pub id: String,
    pub created_at: String,
    pub overall_score: i64,
    pub subject_type: String,
    pub project_id: String,
    pub quest_code: Option<String>,
    pub quest_title: Option<String>,
    pub run_id: Option<String>,
    pub note_updated_at: Option<String>,
}

#[tauri::command]
pub fn feedback_timeline_list(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<FeedbackTimelineItem>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let limit = normalize_timeline_limit(limit);

    if let Some(project_id) = project_id.as_ref() {
        ensure_project_exists(&conn, project_id)?;
    }

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

#[tauri::command]
pub fn analyze_attempt(
    app: tauri::AppHandle,
    profile_id: String,
    attempt_id: String,
) -> Result<AnalyzeResponse, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let mut conn = db::open_profile(&app, &profile_id)?;

    let row = conn
        .query_row(
            "SELECT qa.output_text, qa.transcript_id, q.estimated_sec
             FROM quest_attempts qa
             JOIN quests q ON qa.quest_code = q.code
             WHERE qa.id = ?1",
            [attempt_id.as_str()],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            },
        )
        .map_err(|e| format!("attempt_lookup: {e}"))?;

    let mut source = "text";
    let text = if let Some(text) = row.0 {
        text
    } else if let Some(transcript_id) = row.1 {
        source = "transcript";
        let transcript = transcript::load_transcript(&app, &profile_id, &transcript_id)?;
        transcript::transcript_text(&transcript)?
    } else {
        return Err("attempt_missing_text".to_string());
    };
    let estimated_sec = row.2;

    let feedback = analysis::build_feedback_from_text(&text, estimated_sec);
    let feedback_json = serde_json::to_vec(&feedback).map_err(|e| format!("feedback_json: {e}"))?;
    let metadata = serde_json::json!({
        "source": source,
        "attempt_id": attempt_id,
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
            "quest_attempt",
            attempt_id,
            now,
            record.id,
            feedback.overall_score
        ],
    )
    .map_err(|e| format!("feedback_insert: {e}"))?;
    tx.execute(
        "UPDATE quest_attempts SET feedback_id = ?1 WHERE id = ?2",
        params![feedback_id, attempt_id],
    )
    .map_err(|e| format!("attempt_update: {e}"))?;
    tx.commit().map_err(|e| format!("commit: {e}"))?;

    Ok(AnalyzeResponse { feedback_id })
}

#[tauri::command]
pub fn feedback_get(
    app: tauri::AppHandle,
    profile_id: String,
    feedback_id: String,
) -> Result<models::FeedbackV1, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let artifact_id: String = conn
        .query_row(
            "SELECT feedback_json_artifact_id FROM auto_feedback WHERE id = ?1",
            [feedback_id.as_str()],
            |row| row.get(0),
        )
        .map_err(|e| format!("feedback_lookup: {e}"))?;

    let artifact = artifacts::get_artifact(&app, &profile_id, &artifact_id)?;
    if artifact.artifact_type != "feedback" {
        return Err("artifact_not_feedback".to_string());
    }
    let profile_dir = db::profile_dir(&app, &profile_id)?;
    let feedback_path = profile_dir.join(&artifact.relpath);
    let bytes = std::fs::read(&feedback_path).map_err(|e| format!("feedback_read: {e}"))?;
    let feedback: models::FeedbackV1 =
        serde_json::from_slice(&bytes).map_err(|e| format!("feedback_parse: {e}"))?;
    Ok(feedback)
}

#[tauri::command]
pub fn feedback_context_get(
    app: tauri::AppHandle,
    profile_id: String,
    feedback_id: String,
) -> Result<FeedbackContext, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let (subject_type, subject_id): (String, String) = conn
        .query_row(
            "SELECT subject_type, subject_id FROM auto_feedback WHERE id = ?1",
            [feedback_id.as_str()],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("feedback_lookup: {e}"))?;

    if subject_type == "quest_attempt" {
        let (attempt_id, project_id, quest_code, quest_title): (String, String, String, String) =
            conn.query_row(
                "SELECT qa.id, qa.project_id, qa.quest_code, q.title
                 FROM quest_attempts qa
                 JOIN quests q ON qa.quest_code = q.code
                 WHERE qa.id = ?1",
                [subject_id.as_str()],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .map_err(|e| format!("attempt_lookup: {e}"))?;

        return Ok(FeedbackContext {
            subject_type,
            subject_id: attempt_id,
            project_id,
            quest_code: Some(quest_code),
            quest_title: Some(quest_title),
            run_id: None,
        });
    }

    if subject_type == "run" {
        let project_id: String = conn
            .query_row(
                "SELECT project_id FROM runs WHERE id = ?1",
                [subject_id.as_str()],
                |row| row.get(0),
            )
            .map_err(|e| format!("run_lookup: {e}"))?;

        return Ok(FeedbackContext {
            subject_type,
            subject_id: subject_id.clone(),
            project_id,
            quest_code: None,
            quest_title: None,
            run_id: Some(subject_id),
        });
    }

    Err("feedback_subject_not_supported".to_string())
}

#[tauri::command]
pub fn feedback_note_get(
    app: tauri::AppHandle,
    profile_id: String,
    feedback_id: String,
) -> Result<Option<String>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let note = conn
        .query_row(
            "SELECT note_text FROM feedback_notes WHERE feedback_id = ?1",
            [feedback_id.as_str()],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("note_lookup: {e}"))?;
    Ok(note)
}

#[tauri::command]
pub fn feedback_note_set(
    app: tauri::AppHandle,
    profile_id: String,
    feedback_id: String,
    note: String,
) -> Result<(), String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM auto_feedback WHERE id = ?1",
            [feedback_id.as_str()],
            |row| row.get(0),
        )
        .map_err(|e| format!("feedback_check: {e}"))?;
    if exists == 0 {
        return Err("feedback_not_found".to_string());
    }

    let trimmed = note.trim();
    if trimmed.is_empty() {
        conn.execute(
            "DELETE FROM feedback_notes WHERE feedback_id = ?1",
            [feedback_id.as_str()],
        )
        .map_err(|e| format!("note_delete: {e}"))?;
        return Ok(());
    }

    let now = time::now_rfc3339();
    conn.execute(
        "INSERT INTO feedback_notes (feedback_id, note_text, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(feedback_id) DO UPDATE SET note_text = excluded.note_text, updated_at = excluded.updated_at",
        params![feedback_id, trimmed, now],
    )
    .map_err(|e| format!("note_upsert: {e}"))?;
    Ok(())
}

fn ensure_project_exists(conn: &rusqlite::Connection, project_id: &str) -> Result<(), String> {
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

fn normalize_timeline_limit(limit: Option<u32>) -> i64 {
    let raw = limit.unwrap_or(30).max(1);
    raw.min(100) as i64
}

#[cfg(test)]
mod tests {
    use super::normalize_timeline_limit;

    #[test]
    fn timeline_limit_defaults_to_thirty() {
        assert_eq!(normalize_timeline_limit(None), 30);
    }

    #[test]
    fn timeline_limit_clamps_bounds() {
        assert_eq!(normalize_timeline_limit(Some(0)), 1);
        assert_eq!(normalize_timeline_limit(Some(5)), 5);
        assert_eq!(normalize_timeline_limit(Some(300)), 100);
    }
}
