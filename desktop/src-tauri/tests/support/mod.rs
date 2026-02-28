#![allow(dead_code)]

use rusqlite::{params, Connection};

const GLOBAL_MIGRATION: &str = include_str!("../../../../migrations/global/0001_init.sql");
const PROFILE_MIGRATION: &str = include_str!("../../../../migrations/profile/0001_init.sql");

pub fn new_global_conn() -> Connection {
    let conn = Connection::open_in_memory().expect("open global db");
    conn.execute_batch(GLOBAL_MIGRATION)
        .expect("apply global migration");
    conn
}

pub fn new_profile_conn() -> Connection {
    let conn = Connection::open_in_memory().expect("open profile db");
    conn.execute_batch(PROFILE_MIGRATION)
        .expect("apply profile migration");
    conn
}

pub fn seed_project(conn: &Connection, id: &str, title: &str, created_at: &str) {
    conn.execute(
        "INSERT INTO talk_projects (id, title, stage, created_at, updated_at)
         VALUES (?1, ?2, 'train', ?3, ?3)",
        params![id, title, created_at],
    )
    .expect("seed project");
}

pub fn seed_quest(conn: &Connection, code: &str, title: &str, output_type: &str) {
    conn.execute(
        "INSERT INTO quests (code, title, category, estimated_sec, prompt, output_type, targets_issues_json)
         VALUES (?1, ?2, 'clarity', 60, 'prompt', ?3, '[]')",
        params![code, title, output_type],
    )
    .expect("seed quest");
}

pub fn seed_attempt(
    conn: &Connection,
    id: &str,
    project_id: &str,
    quest_code: &str,
    created_at: &str,
) {
    conn.execute(
        "INSERT INTO quest_attempts (id, project_id, quest_code, created_at, output_text)
         VALUES (?1, ?2, ?3, ?4, 'answer')",
        params![id, project_id, quest_code, created_at],
    )
    .expect("seed attempt");
}

pub fn seed_run(
    conn: &Connection,
    id: &str,
    project_id: &str,
    created_at: &str,
    transcript_id: Option<&str>,
) {
    conn.execute(
        "INSERT INTO runs (id, project_id, created_at, transcript_id)
         VALUES (?1, ?2, ?3, ?4)",
        params![id, project_id, created_at, transcript_id],
    )
    .expect("seed run");
}

pub fn seed_auto_feedback(
    conn: &Connection,
    id: &str,
    subject_type: &str,
    subject_id: &str,
    created_at: &str,
    overall_score: i64,
) {
    conn.execute(
        "INSERT INTO auto_feedback (id, subject_type, subject_id, created_at, feedback_json_artifact_id, overall_score)
         VALUES (?1, ?2, ?3, ?4, 'art_feedback_stub', ?5)",
        params![id, subject_type, subject_id, created_at, overall_score],
    )
    .expect("seed auto feedback");
}

pub fn seed_feedback_note(conn: &Connection, feedback_id: &str, note: &str, updated_at: &str) {
    conn.execute(
        "INSERT INTO feedback_notes (feedback_id, note_text, updated_at) VALUES (?1, ?2, ?3)",
        params![feedback_id, note, updated_at],
    )
    .expect("seed feedback note");
}
