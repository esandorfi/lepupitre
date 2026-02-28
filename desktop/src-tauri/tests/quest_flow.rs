use rusqlite::{params, Connection};

mod support;

fn submit_text(
    conn: &Connection,
    attempt_id: &str,
    project_id: &str,
    quest_code: &str,
    created_at: &str,
    text: &str,
) {
    conn.execute(
        "INSERT INTO quest_attempts (id, project_id, quest_code, created_at, output_text)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![attempt_id, project_id, quest_code, created_at, text],
    )
    .expect("submit text");
}

fn submit_audio_upsert(
    conn: &Connection,
    new_attempt_id: &str,
    project_id: &str,
    quest_code: &str,
    created_at: &str,
    audio_artifact_id: &str,
    transcript_id: Option<&str>,
) -> String {
    let existing = conn
        .query_row(
            "SELECT id, transcript_id FROM quest_attempts WHERE audio_artifact_id = ?1",
            params![audio_artifact_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .ok();

    if let Some((attempt_id, existing_transcript_id)) = existing {
        if transcript_id.is_some() && transcript_id.map(|v| v.to_string()) != existing_transcript_id
        {
            conn.execute(
                "UPDATE quest_attempts SET transcript_id = ?1 WHERE id = ?2",
                params![transcript_id, attempt_id],
            )
            .expect("update transcript");
        }
        return attempt_id;
    }

    conn.execute(
        "INSERT INTO quest_attempts (id, project_id, quest_code, created_at, audio_artifact_id, transcript_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            new_attempt_id,
            project_id,
            quest_code,
            created_at,
            audio_artifact_id,
            transcript_id
        ],
    )
    .expect("insert audio");
    new_attempt_id.to_string()
}

#[test]
fn quest_text_submission_and_report_latest_attempt_behavior() {
    let conn = support::new_profile_conn();
    support::seed_quest(&conn, "Q-1", "Quest Q-1", "text");
    support::seed_quest(&conn, "Q-2", "Quest Q-2", "audio");

    submit_text(
        &conn,
        "att_1",
        "proj_1",
        "Q-1",
        "2026-02-28T10:00:00Z",
        "first answer",
    );
    submit_text(
        &conn,
        "att_2",
        "proj_1",
        "Q-1",
        "2026-02-28T10:01:00Z",
        "second answer",
    );

    let latest_attempt: String = conn
        .query_row(
            "SELECT id FROM quest_attempts WHERE project_id = ?1 AND quest_code = ?2 ORDER BY created_at DESC LIMIT 1",
            params!["proj_1", "Q-1"],
            |row| row.get(0),
        )
        .expect("latest");
    assert_eq!(latest_attempt, "att_2");
}

#[test]
fn quest_audio_submission_reuses_attempt_and_updates_transcript() {
    let conn = support::new_profile_conn();
    support::seed_quest(&conn, "Q-2", "Quest Q-2", "audio");

    let first_id = submit_audio_upsert(
        &conn,
        "att_audio_1",
        "proj_1",
        "Q-2",
        "2026-02-28T11:00:00Z",
        "art_audio_1",
        None,
    );
    let second_id = submit_audio_upsert(
        &conn,
        "att_audio_2",
        "proj_1",
        "Q-2",
        "2026-02-28T11:01:00Z",
        "art_audio_1",
        Some("tr_1"),
    );

    assert_eq!(first_id, "att_audio_1");
    assert_eq!(second_id, "att_audio_1");

    let transcript_id: Option<String> = conn
        .query_row(
            "SELECT transcript_id FROM quest_attempts WHERE id = ?1",
            params!["att_audio_1"],
            |row| row.get(0),
        )
        .expect("query transcript");
    assert_eq!(transcript_id.as_deref(), Some("tr_1"));
}
