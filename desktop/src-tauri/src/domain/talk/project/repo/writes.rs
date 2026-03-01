use rusqlite::params;

pub fn insert_project(
    conn: &rusqlite::Connection,
    id: &str,
    title: &str,
    audience: Option<&str>,
    goal: Option<&str>,
    duration_target_sec: Option<i64>,
    talk_number: i64,
    now: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO talk_projects (id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            title,
            audience,
            goal,
            duration_target_sec,
            talk_number,
            "draft",
            now,
            now
        ],
    )
    .map_err(|e| format!("insert: {e}"))?;
    Ok(())
}

pub fn update_project(
    conn: &rusqlite::Connection,
    project_id: &str,
    title: &str,
    audience: Option<&str>,
    goal: Option<&str>,
    duration_target_sec: Option<i64>,
    stage: &str,
    now: &str,
) -> Result<usize, String> {
    conn.execute(
        "UPDATE talk_projects
         SET title = ?2,
             audience = ?3,
             goal = ?4,
             duration_target_sec = ?5,
             stage = ?6,
             updated_at = ?7
         WHERE id = ?1",
        params![
            project_id,
            title,
            audience,
            goal,
            duration_target_sec,
            stage,
            now
        ],
    )
    .map_err(|e| format!("project_update: {e}"))
}

pub fn set_active_project_id(conn: &rusqlite::Connection, project_id: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO active_state (id, active_project_id) VALUES (1, ?1)",
        params![project_id],
    )
    .map_err(|e| format!("active_set: {e}"))?;
    Ok(())
}

pub fn insert_training_project(
    conn: &rusqlite::Connection,
    project_id: &str,
    now: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO talk_projects (id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at, is_training)
         VALUES (?1, ?2, NULL, NULL, NULL, NULL, ?3, ?4, ?4, 1)",
        params![project_id, "Training", "draft", now],
    )
    .map_err(|e| format!("training_insert: {e}"))?;

    Ok(())
}
