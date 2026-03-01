use super::super::types::ProjectListItem;
use crate::kernel::models::ProjectSummary;
use rusqlite::{params, OptionalExtension};

pub fn fetch_project_by_id(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<Option<ProjectSummary>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at
             FROM talk_projects
             WHERE id = ?1",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let project = stmt
        .query_row([project_id], |row| {
            Ok(ProjectSummary {
                id: row.get(0)?,
                title: row.get(1)?,
                audience: row.get(2)?,
                goal: row.get(3)?,
                duration_target_sec: row.get(4)?,
                talk_number: row.get(5)?,
                stage: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .optional()
        .map_err(|e| format!("project_lookup: {e}"))?;

    Ok(project)
}

pub fn fetch_latest_project(conn: &rusqlite::Connection) -> Result<Option<ProjectSummary>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at
             FROM talk_projects
             WHERE COALESCE(is_training, 0) = 0
             ORDER BY updated_at DESC
             LIMIT 1",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let mut rows = stmt.query([]).map_err(|e| format!("query: {e}"))?;
    if let Some(row) = rows.next().map_err(|e| format!("row: {e}"))? {
        let summary = ProjectSummary {
            id: row.get(0).map_err(|e| format!("id: {e}"))?,
            title: row.get(1).map_err(|e| format!("title: {e}"))?,
            audience: row.get(2).map_err(|e| format!("audience: {e}"))?,
            goal: row.get(3).map_err(|e| format!("goal: {e}"))?,
            duration_target_sec: row.get(4).map_err(|e| format!("duration: {e}"))?,
            talk_number: row.get(5).map_err(|e| format!("talk_number: {e}"))?,
            stage: row.get(6).map_err(|e| format!("stage: {e}"))?,
            created_at: row.get(7).map_err(|e| format!("created_at: {e}"))?,
            updated_at: row.get(8).map_err(|e| format!("updated_at: {e}"))?,
        };
        return Ok(Some(summary));
    }

    Ok(None)
}

pub fn select_project_list(conn: &rusqlite::Connection) -> Result<Vec<ProjectListItem>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at
             FROM talk_projects
             WHERE COALESCE(is_training, 0) = 0
             ORDER BY updated_at DESC",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ProjectListItem {
                id: row.get(0)?,
                title: row.get(1)?,
                audience: row.get(2)?,
                goal: row.get(3)?,
                duration_target_sec: row.get(4)?,
                talk_number: row.get(5)?,
                stage: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                is_active: false,
            })
        })
        .map_err(|e| format!("query: {e}"))?;

    let mut projects = Vec::new();
    for row in rows {
        projects.push(row.map_err(|e| format!("row: {e}"))?);
    }

    Ok(projects)
}

pub fn get_active_project_id(conn: &rusqlite::Connection) -> Result<Option<String>, String> {
    let active = conn
        .query_row(
            "SELECT active_project_id FROM active_state WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("active_lookup: {e}"))?;
    Ok(active)
}

pub fn next_talk_number(conn: &rusqlite::Connection) -> Result<i64, String> {
    let max_value: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(talk_number), 0)
             FROM talk_projects
             WHERE COALESCE(is_training, 0) = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("talk_number_max: {e}"))?;
    Ok(max_value + 1)
}

pub fn find_training_project_id(conn: &rusqlite::Connection) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT id FROM talk_projects WHERE COALESCE(is_training, 0) = 1 LIMIT 1",
        [],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("training_find: {e}"))
}

pub fn is_training_project(conn: &rusqlite::Connection, project_id: &str) -> Result<bool, String> {
    let value = conn
        .query_row(
            "SELECT COALESCE(is_training, 0) FROM talk_projects WHERE id = ?1",
            params![project_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|e| format!("training_check: {e}"))?;
    Ok(value.unwrap_or(0) > 0)
}

pub fn select_project_training_state(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<Option<i64>, String> {
    conn.query_row(
        "SELECT COALESCE(is_training, 0) FROM talk_projects WHERE id = ?1",
        params![project_id],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| format!("project_check: {e}"))
}
