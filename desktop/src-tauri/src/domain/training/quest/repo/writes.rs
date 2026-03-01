use rusqlite::params;

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
