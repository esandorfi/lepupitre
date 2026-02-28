use rusqlite::{params, Connection};

mod support;

#[derive(Debug)]
struct TimelineItem {
    id: String,
    subject_type: String,
    project_id: String,
    run_id: Option<String>,
    quest_code: Option<String>,
    note_updated_at: Option<String>,
}

fn normalize_timeline_limit(limit: Option<u32>) -> i64 {
    let raw = limit.unwrap_or(30).max(1);
    raw.min(100) as i64
}

fn analyze_run_link_feedback(
    conn: &Connection,
    run_id: &str,
    feedback_id: &str,
    now: &str,
    overall_score: i64,
) -> Result<String, String> {
    let (transcript_id, existing_feedback_id): (Option<String>, Option<String>) = conn
        .query_row(
            "SELECT transcript_id, feedback_id FROM runs WHERE id = ?1",
            params![run_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("run_lookup: {e}"))?;

    if let Some(existing_feedback_id) = existing_feedback_id {
        return Ok(existing_feedback_id);
    }

    if transcript_id.is_none() {
        return Err("run_missing_transcript".to_string());
    }

    conn.execute(
        "INSERT INTO auto_feedback (id, subject_type, subject_id, created_at, feedback_json_artifact_id, overall_score)
         VALUES (?1, 'run', ?2, ?3, ?4, ?5)",
        params![feedback_id, run_id, now, "art_feedback_stub", overall_score],
    )
    .map_err(|e| format!("feedback_insert: {e}"))?;
    conn.execute(
        "UPDATE runs SET feedback_id = ?1 WHERE id = ?2",
        params![feedback_id, run_id],
    )
    .map_err(|e| format!("run_update: {e}"))?;
    Ok(feedback_id.to_string())
}

fn feedback_note_set(
    conn: &Connection,
    feedback_id: &str,
    note: &str,
    now: &str,
) -> Result<(), String> {
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM auto_feedback WHERE id = ?1",
            [feedback_id],
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
            [feedback_id],
        )
        .map_err(|e| format!("note_delete: {e}"))?;
        return Ok(());
    }

    conn.execute(
        "INSERT INTO feedback_notes (feedback_id, note_text, updated_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(feedback_id) DO UPDATE SET note_text = excluded.note_text, updated_at = excluded.updated_at",
        params![feedback_id, trimmed, now],
    )
    .map_err(|e| format!("note_upsert: {e}"))?;
    Ok(())
}

fn feedback_timeline_query(
    conn: &Connection,
    project_id: Option<&str>,
    limit: Option<u32>,
) -> Vec<TimelineItem> {
    let mut stmt = conn
        .prepare(
            "SELECT af.id, af.subject_type, COALESCE(qa.project_id, r.project_id) AS project_id,
                    r.id, qa.quest_code, fn.updated_at
             FROM auto_feedback af
             LEFT JOIN quest_attempts qa
               ON af.subject_type = 'quest_attempt' AND qa.id = af.subject_id
             LEFT JOIN runs r
               ON af.subject_type = 'run' AND r.id = af.subject_id
             LEFT JOIN feedback_notes fn ON fn.feedback_id = af.id
             WHERE af.subject_type IN ('quest_attempt', 'run')
               AND COALESCE(qa.project_id, r.project_id) IS NOT NULL
               AND (?1 IS NULL OR COALESCE(qa.project_id, r.project_id) = ?1)
             ORDER BY af.created_at DESC
             LIMIT ?2",
        )
        .expect("prepare timeline");
    let rows = stmt
        .query_map(
            params![project_id, normalize_timeline_limit(limit)],
            |row| {
                Ok(TimelineItem {
                    id: row.get(0)?,
                    subject_type: row.get(1)?,
                    project_id: row.get(2)?,
                    run_id: row.get(3)?,
                    quest_code: row.get(4)?,
                    note_updated_at: row.get(5)?,
                })
            },
        )
        .expect("query timeline");

    let mut out = Vec::new();
    for row in rows {
        out.push(row.expect("timeline row"));
    }
    out
}

#[test]
fn run_analysis_links_feedback_and_is_idempotent() {
    let conn = support::new_profile_conn();
    support::seed_project(&conn, "proj_1", "Talk", "2026-02-28T10:00:00Z");
    support::seed_run(
        &conn,
        "run_1",
        "proj_1",
        "2026-02-28T10:01:00Z",
        Some("tr_1"),
    );

    let first = analyze_run_link_feedback(&conn, "run_1", "fb_1", "2026-02-28T10:02:00Z", 72)
        .expect("first analyze");
    assert_eq!(first, "fb_1");

    let second = analyze_run_link_feedback(&conn, "run_1", "fb_2", "2026-02-28T10:03:00Z", 75)
        .expect("second analyze");
    assert_eq!(second, "fb_1");

    let total_feedback: i64 = conn
        .query_row("SELECT COUNT(*) FROM auto_feedback", [], |row| row.get(0))
        .expect("feedback count");
    assert_eq!(total_feedback, 1);
}

#[test]
fn run_analysis_requires_transcript_before_feedback() {
    let conn = support::new_profile_conn();
    support::seed_project(&conn, "proj_1", "Talk", "2026-02-28T10:00:00Z");
    support::seed_run(&conn, "run_1", "proj_1", "2026-02-28T10:01:00Z", None);

    let err = analyze_run_link_feedback(&conn, "run_1", "fb_1", "2026-02-28T10:02:00Z", 72)
        .expect_err("analyze should fail without transcript");
    assert_eq!(err, "run_missing_transcript");
}

#[test]
fn feedback_note_upsert_and_delete_flow() {
    let conn = support::new_profile_conn();
    support::seed_auto_feedback(&conn, "fb_1", "run", "run_1", "2026-02-28T11:00:00Z", 80);

    feedback_note_set(&conn, "fb_1", "  first note  ", "2026-02-28T11:01:00Z")
        .expect("insert note");
    let first_note: String = conn
        .query_row(
            "SELECT note_text FROM feedback_notes WHERE feedback_id = 'fb_1'",
            [],
            |row| row.get(0),
        )
        .expect("read first note");
    assert_eq!(first_note, "first note");

    feedback_note_set(&conn, "fb_1", "second note", "2026-02-28T11:02:00Z").expect("update note");
    let second_note: String = conn
        .query_row(
            "SELECT note_text FROM feedback_notes WHERE feedback_id = 'fb_1'",
            [],
            |row| row.get(0),
        )
        .expect("read second note");
    assert_eq!(second_note, "second note");

    feedback_note_set(&conn, "fb_1", "   ", "2026-02-28T11:03:00Z").expect("delete note");
    let count_after_delete: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM feedback_notes WHERE feedback_id = 'fb_1'",
            [],
            |row| row.get(0),
        )
        .expect("count after delete");
    assert_eq!(count_after_delete, 0);

    let err = feedback_note_set(&conn, "missing_feedback", "x", "2026-02-28T11:04:00Z")
        .expect_err("missing feedback should fail");
    assert_eq!(err, "feedback_not_found");
}

#[test]
fn feedback_timeline_scopes_items_and_preserves_subject_context() {
    let conn = support::new_profile_conn();
    support::seed_project(&conn, "proj_1", "Talk 1", "2026-02-28T10:00:00Z");
    support::seed_project(&conn, "proj_2", "Talk 2", "2026-02-28T10:05:00Z");
    support::seed_quest(&conn, "Q-1", "Quest 1", "text");
    support::seed_attempt(&conn, "att_1", "proj_1", "Q-1", "2026-02-28T10:10:00Z");
    support::seed_run(
        &conn,
        "run_1",
        "proj_2",
        "2026-02-28T10:12:00Z",
        Some("tr_1"),
    );
    support::seed_auto_feedback(
        &conn,
        "fb_attempt",
        "quest_attempt",
        "att_1",
        "2026-02-28T10:11:00Z",
        70,
    );
    support::seed_auto_feedback(&conn, "fb_run", "run", "run_1", "2026-02-28T10:13:00Z", 82);
    support::seed_feedback_note(&conn, "fb_run", "note", "2026-02-28T10:14:00Z");

    let all = feedback_timeline_query(&conn, None, Some(30));
    assert_eq!(all.len(), 2);
    assert_eq!(all[0].id, "fb_run");
    assert_eq!(all[0].subject_type, "run");
    assert_eq!(all[0].project_id, "proj_2");
    assert_eq!(all[0].run_id.as_deref(), Some("run_1"));
    assert_eq!(
        all[0].note_updated_at.as_deref(),
        Some("2026-02-28T10:14:00Z")
    );

    let scoped = feedback_timeline_query(&conn, Some("proj_1"), Some(30));
    assert_eq!(scoped.len(), 1);
    assert_eq!(scoped[0].id, "fb_attempt");
    assert_eq!(scoped[0].subject_type, "quest_attempt");
    assert_eq!(scoped[0].quest_code.as_deref(), Some("Q-1"));
}
