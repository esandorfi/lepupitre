use crate::core::{artifacts, db, ids, models::Quest, models::QuestDaily, time};
use rusqlite::{params, OptionalExtension};
use serde::Serialize;

#[tauri::command]
pub fn quest_get_daily(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<QuestDaily, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let quest = quest_first(&conn)?;

    let why = format!("Project {} is in draft", project_id);

    Ok(QuestDaily {
        quest,
        why,
        due_boss_run: false,
    })
}

#[tauri::command]
pub fn quest_get_by_code(
    app: tauri::AppHandle,
    profile_id: String,
    quest_code: String,
) -> Result<Quest, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let quest = quest_by_code(&conn, &quest_code)?;
    Ok(quest)
}

#[derive(Debug, Serialize)]
pub struct QuestAttemptSummary {
    pub id: String,
    pub quest_code: String,
    pub quest_title: String,
    pub output_type: String,
    pub created_at: String,
    pub has_audio: bool,
    pub has_transcript: bool,
    pub has_feedback: bool,
    pub feedback_id: Option<String>,
}

#[tauri::command]
pub fn quest_attempts_list(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    limit: Option<u32>,
) -> Result<Vec<QuestAttemptSummary>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let limit = limit.unwrap_or(6).max(1) as i64;

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

#[tauri::command]
pub fn quest_submit_text(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    quest_code: String,
    text: String,
) -> Result<String, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let id = ids::new_id("att");
    let now = time::now_rfc3339();

    conn.execute(
        "INSERT INTO quest_attempts (id, project_id, quest_code, created_at, output_text)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, project_id, quest_code, now, text],
    )
    .map_err(|e| format!("insert: {e}"))?;

    Ok(id)
}

#[tauri::command]
pub fn quest_submit_audio(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    quest_code: String,
    audio_artifact_id: String,
    transcript_id: Option<String>,
) -> Result<String, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    ensure_quest_exists(&conn, &quest_code)?;
    ensure_audio_artifact(&app, &profile_id, &audio_artifact_id)?;
    if let Some(ref transcript_id) = transcript_id {
        ensure_transcript_artifact(&app, &profile_id, transcript_id)?;
    }

    let existing: Option<(String, Option<String>)> = conn
        .query_row(
            "SELECT id, transcript_id FROM quest_attempts WHERE audio_artifact_id = ?1",
            params![audio_artifact_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|e| format!("attempt_lookup: {e}"))?;

    if let Some((attempt_id, existing_transcript_id)) = existing {
        if transcript_id.is_some() && transcript_id != existing_transcript_id {
            conn.execute(
                "UPDATE quest_attempts SET transcript_id = ?1 WHERE id = ?2",
                params![transcript_id, attempt_id],
            )
            .map_err(|e| format!("attempt_update: {e}"))?;
        }
        return Ok(attempt_id);
    }

    let id = ids::new_id("att");
    let now = time::now_rfc3339();

    conn.execute(
        "INSERT INTO quest_attempts (id, project_id, quest_code, created_at, audio_artifact_id, transcript_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            project_id,
            quest_code,
            now,
            audio_artifact_id,
            transcript_id
        ],
    )
    .map_err(|e| format!("insert: {e}"))?;

    Ok(id)
}

fn quest_first(conn: &rusqlite::Connection) -> Result<Quest, String> {
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

fn quest_by_code(conn: &rusqlite::Connection, quest_code: &str) -> Result<Quest, String> {
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

fn ensure_quest_exists(conn: &rusqlite::Connection, quest_code: &str) -> Result<(), String> {
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
