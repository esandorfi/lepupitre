use super::super::queries;
use rusqlite::{params, Connection};

pub(in crate::domain::run) fn insert_run(
    conn: &Connection,
    run_id: &str,
    project_id: &str,
    created_at: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(queries::INSERT_RUN, params![run_id, project_id, created_at])?;
    Ok(())
}

pub(in crate::domain::run) fn update_run_audio(
    conn: &Connection,
    run_id: &str,
    audio_artifact_id: &str,
) -> Result<usize, String> {
    conn.execute(
        queries::UPDATE_RUN_AUDIO,
        params![audio_artifact_id, run_id],
    )
    .map_err(|e| format!("run_finish: {e}"))
}

pub(in crate::domain::run) fn update_run_transcript(
    conn: &Connection,
    run_id: &str,
    transcript_id: &str,
) -> Result<usize, String> {
    conn.execute(
        queries::UPDATE_RUN_TRANSCRIPT,
        params![transcript_id, run_id],
    )
    .map_err(|e| format!("run_transcript: {e}"))
}

pub(in crate::domain::run) fn persist_run_feedback_link(
    conn: &mut Connection,
    feedback_id: &str,
    run_id: &str,
    feedback_artifact_id: &str,
    overall_score: i64,
    now: &str,
) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    tx.execute(
        queries::INSERT_RUN_FEEDBACK,
        params![
            feedback_id,
            "run",
            run_id,
            now,
            feedback_artifact_id,
            overall_score
        ],
    )
    .map_err(|e| format!("feedback_insert: {e}"))?;
    let updated = tx
        .execute(
            queries::UPDATE_RUN_FEEDBACK_LINK,
            params![feedback_id, run_id],
        )
        .map_err(|e| format!("run_update: {e}"))?;
    if updated == 0 {
        return Err("run_update_missing".to_string());
    }
    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn persist_run_feedback_link_rolls_back_when_run_missing() {
        let mut conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "CREATE TABLE runs (
               id TEXT PRIMARY KEY,
               project_id TEXT NOT NULL,
               created_at TEXT NOT NULL,
               audio_artifact_id TEXT,
               transcript_id TEXT,
               feedback_id TEXT
             );
             CREATE TABLE auto_feedback (
               id TEXT PRIMARY KEY,
               subject_type TEXT NOT NULL,
               subject_id TEXT NOT NULL,
               created_at TEXT NOT NULL,
               feedback_json_artifact_id TEXT NOT NULL,
               overall_score INTEGER NOT NULL
             );",
        )
        .expect("schema");

        let err = persist_run_feedback_link(
            &mut conn,
            "fb_missing",
            "run_missing",
            "artifact_fb",
            55,
            "2026-02-28T00:00:00Z",
        )
        .expect_err("missing run");
        assert_eq!(err, "run_update_missing");

        let feedback_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM auto_feedback", [], |row| row.get(0))
            .expect("count");
        assert_eq!(feedback_count, 0);
    }
}
