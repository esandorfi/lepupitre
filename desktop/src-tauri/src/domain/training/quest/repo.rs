use super::types::{QuestAttemptSummary, QuestReportItem};
use crate::kernel::models::Quest;
use rusqlite::{params, OptionalExtension};

pub fn select_first_quest(conn: &rusqlite::Connection) -> Result<Quest, String> {
    let mut stmt = conn
        .prepare(
            "SELECT code, title, category, estimated_sec, prompt, output_type, targets_issues_json
             FROM quests
             ORDER BY code ASC
             LIMIT 1",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let mut rows = stmt.query([]).map_err(|e| format!("query: {e}"))?;
    let row = rows
        .next()
        .map_err(|e| format!("row: {e}"))?
        .ok_or_else(|| "no_quest_seeded".to_string())?;

    quest_from_row(row)
}

pub fn select_quest_by_code(
    conn: &rusqlite::Connection,
    quest_code: &str,
) -> Result<Quest, String> {
    let mut stmt = conn
        .prepare(
            "SELECT code, title, category, estimated_sec, prompt, output_type, targets_issues_json
             FROM quests
             WHERE code = ?1",
        )
        .map_err(|e| format!("prepare: {e}"))?;
    let row = stmt
        .query_row([quest_code], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
            ))
        })
        .map_err(|e| format!("quest_lookup: {e}"))?;

    let targets: Vec<String> =
        serde_json::from_str(&row.6).map_err(|e| format!("targets_parse: {e}"))?;
    Ok(Quest {
        code: row.0,
        title: row.1,
        category: row.2,
        estimated_sec: row.3,
        prompt: row.4,
        output_type: row.5,
        targets_issues: targets,
    })
}

pub fn select_quest_list(conn: &rusqlite::Connection) -> Result<Vec<Quest>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT code, title, category, estimated_sec, prompt, output_type, targets_issues_json
             FROM quests
             ORDER BY category ASC, code ASC",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let mut rows = stmt.query([]).map_err(|e| format!("query: {e}"))?;
    let mut quests = Vec::new();
    while let Some(row) = rows.next().map_err(|e| format!("row: {e}"))? {
        quests.push(quest_from_row(row)?);
    }
    Ok(quests)
}

pub fn select_attempt_summaries(
    conn: &rusqlite::Connection,
    project_id: &str,
    limit: i64,
) -> Result<Vec<QuestAttemptSummary>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT qa.id, qa.quest_code, q.title, q.output_type, qa.created_at,
                    qa.audio_artifact_id, qa.transcript_id, qa.feedback_id
             FROM quest_attempts qa
             JOIN quests q ON qa.quest_code = q.code
             WHERE qa.project_id = ?1
             ORDER BY qa.created_at DESC
             LIMIT ?2",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let rows = stmt
        .query_map(params![project_id, limit], |row| {
            let audio_id: Option<String> = row.get(5)?;
            let transcript_id: Option<String> = row.get(6)?;
            let feedback_id: Option<String> = row.get(7)?;
            Ok(QuestAttemptSummary {
                id: row.get(0)?,
                quest_code: row.get(1)?,
                quest_title: row.get(2)?,
                output_type: row.get(3)?,
                created_at: row.get(4)?,
                has_audio: audio_id.is_some(),
                has_transcript: transcript_id.is_some(),
                has_feedback: feedback_id.is_some(),
                feedback_id,
            })
        })
        .map_err(|e| format!("query: {e}"))?;

    let mut attempts = Vec::new();
    for row in rows {
        attempts.push(row.map_err(|e| format!("row: {e}"))?);
    }

    Ok(attempts)
}

pub fn select_report(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<Vec<QuestReportItem>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT q.code, q.title, q.prompt, q.output_type, q.category, q.estimated_sec,
                    qa.id, qa.created_at, qa.audio_artifact_id, qa.transcript_id, qa.feedback_id
             FROM quests q
             LEFT JOIN (
                SELECT qa1.*
                FROM quest_attempts qa1
                JOIN (
                  SELECT quest_code, MAX(created_at) AS max_created
                  FROM quest_attempts
                  WHERE project_id = ?1
                  GROUP BY quest_code
                ) latest
                ON qa1.quest_code = latest.quest_code AND qa1.created_at = latest.max_created
                WHERE qa1.project_id = ?1
             ) qa ON qa.quest_code = q.code
             ORDER BY q.code ASC",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let rows = stmt
        .query_map(params![project_id], |row| {
            let audio_id: Option<String> = row.get(8)?;
            let transcript_id: Option<String> = row.get(9)?;
            let feedback_id: Option<String> = row.get(10)?;
            Ok(QuestReportItem {
                quest_code: row.get(0)?,
                quest_title: row.get(1)?,
                quest_prompt: row.get(2)?,
                output_type: row.get(3)?,
                category: row.get(4)?,
                estimated_sec: row.get(5)?,
                attempt_id: row.get(6)?,
                attempt_created_at: row.get(7)?,
                has_audio: audio_id.is_some(),
                has_transcript: transcript_id.is_some(),
                has_feedback: feedback_id.is_some(),
                feedback_id,
            })
        })
        .map_err(|e| format!("query: {e}"))?;

    let mut report = Vec::new();
    for row in rows {
        report.push(row.map_err(|e| format!("row: {e}"))?);
    }

    Ok(report)
}

pub fn insert_text_attempt(
    conn: &rusqlite::Connection,
    attempt_id: &str,
    project_id: &str,
    quest_code: &str,
    created_at: &str,
    text: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO quest_attempts (id, project_id, quest_code, created_at, output_text)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![attempt_id, project_id, quest_code, created_at, text],
    )
    .map_err(|e| format!("insert: {e}"))?;
    Ok(())
}

pub fn select_attempt_by_audio(
    conn: &rusqlite::Connection,
    audio_artifact_id: &str,
) -> Result<Option<(String, Option<String>)>, String> {
    conn.query_row(
        "SELECT id, transcript_id FROM quest_attempts WHERE audio_artifact_id = ?1",
        params![audio_artifact_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .optional()
    .map_err(|e| format!("attempt_lookup: {e}"))
}

pub fn update_attempt_transcript(
    conn: &rusqlite::Connection,
    attempt_id: &str,
    transcript_id: Option<&str>,
) -> Result<(), String> {
    conn.execute(
        "UPDATE quest_attempts SET transcript_id = ?1 WHERE id = ?2",
        params![transcript_id, attempt_id],
    )
    .map_err(|e| format!("attempt_update: {e}"))?;
    Ok(())
}

pub fn insert_audio_attempt(
    conn: &rusqlite::Connection,
    attempt_id: &str,
    project_id: &str,
    quest_code: &str,
    created_at: &str,
    audio_artifact_id: &str,
    transcript_id: Option<&str>,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO quest_attempts (id, project_id, quest_code, created_at, audio_artifact_id, transcript_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            attempt_id,
            project_id,
            quest_code,
            created_at,
            audio_artifact_id,
            transcript_id
        ],
    )
    .map_err(|e| format!("insert: {e}"))?;
    Ok(())
}

pub fn ensure_quest_exists(conn: &rusqlite::Connection, quest_code: &str) -> Result<(), String> {
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM quests WHERE code = ?1",
            [quest_code],
            |row| row.get(0),
        )
        .map_err(|e| format!("quest_check: {e}"))?;
    if exists == 0 {
        return Err("quest_not_found".to_string());
    }
    Ok(())
}

fn quest_from_row(row: &rusqlite::Row<'_>) -> Result<Quest, String> {
    let targets_json: String = row.get(6).map_err(|e| format!("targets: {e}"))?;
    let targets: Vec<String> =
        serde_json::from_str(&targets_json).map_err(|e| format!("targets_parse: {e}"))?;
    Ok(Quest {
        code: row.get(0).map_err(|e| format!("code: {e}"))?,
        title: row.get(1).map_err(|e| format!("title: {e}"))?,
        category: row.get(2).map_err(|e| format!("category: {e}"))?,
        estimated_sec: row.get(3).map_err(|e| format!("estimated: {e}"))?,
        prompt: row.get(4).map_err(|e| format!("prompt: {e}"))?,
        output_type: row.get(5).map_err(|e| format!("output_type: {e}"))?,
        targets_issues: targets,
    })
}
