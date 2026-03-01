use rusqlite::{params, Connection};

pub fn delete_feedback_note(conn: &Connection, feedback_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM feedback_notes WHERE feedback_id = ?1",
        [feedback_id],
    )
    .map_err(|e| format!("note_delete: {e}"))?;
    Ok(())
}

pub fn upsert_feedback_note(
    conn: &Connection,
    feedback_id: &str,
    note: &str,
    now: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO feedback_notes (feedback_id, note_text, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(feedback_id) DO UPDATE SET note_text = excluded.note_text, updated_at = excluded.updated_at",
        params![feedback_id, note, now],
    )
    .map_err(|e| format!("note_upsert: {e}"))?;
    Ok(())
}

pub fn persist_attempt_feedback_link(
    conn: &mut Connection,
    feedback_id: &str,
    attempt_id: &str,
    feedback_artifact_id: &str,
    overall_score: i64,
    now: &str,
) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    tx.execute(
        "INSERT INTO auto_feedback (id, subject_type, subject_id, created_at, feedback_json_artifact_id, overall_score)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            feedback_id,
            "quest_attempt",
            attempt_id,
            now,
            feedback_artifact_id,
            overall_score
        ],
    )
    .map_err(|e| format!("feedback_insert: {e}"))?;
    let updated = tx
        .execute(
            "UPDATE quest_attempts SET feedback_id = ?1 WHERE id = ?2",
            params![feedback_id, attempt_id],
        )
        .map_err(|e| format!("attempt_update: {e}"))?;
    if updated == 0 {
        return Err("attempt_update_missing".to_string());
    }
    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(())
}
