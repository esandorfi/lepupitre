use crate::core::{db, ids, models::ProjectCreatePayload, models::ProjectSummary, time};
use rusqlite::{params, OptionalExtension};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ProjectListItem {
    pub id: String,
    pub title: String,
    pub audience: Option<String>,
    pub goal: Option<String>,
    pub duration_target_sec: Option<i64>,
    pub talk_number: Option<i64>,
    pub stage: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_active: bool,
}

#[tauri::command]
pub fn project_create(
    app: tauri::AppHandle,
    profile_id: String,
    payload: ProjectCreatePayload,
) -> Result<String, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let id = ids::new_id("proj");
    let now = time::now_rfc3339();
    let talk_number = next_talk_number(&conn)?;

    conn.execute(
        "INSERT INTO talk_projects (id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            payload.title,
            payload.audience,
            payload.goal,
            payload.duration_target_sec,
            talk_number,
            "draft",
            now,
            now
        ],
    )
    .map_err(|e| format!("insert: {e}"))?;

    set_active_project_id(&conn, &id)?;

    Ok(id)
}

#[tauri::command]
pub fn project_get_active(
    app: tauri::AppHandle,
    profile_id: String,
) -> Result<Option<ProjectSummary>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    if let Some(active_id) = get_active_project_id(&conn)? {
        if let Some(active) = fetch_project_by_id(&conn, &active_id)? {
            return Ok(Some(active));
        }
    }

    if let Some(latest) = fetch_latest_project(&conn)? {
        let _ = set_active_project_id(&conn, &latest.id);
        return Ok(Some(latest));
    }

    Ok(None)
}

#[tauri::command]
pub fn project_list(
    app: tauri::AppHandle,
    profile_id: String,
) -> Result<Vec<ProjectListItem>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;
    let active_id = get_active_project_id(&conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at
             FROM talk_projects
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
        let mut project = row.map_err(|e| format!("row: {e}"))?;
        if let Some(ref active) = active_id {
            project.is_active = project.id == *active;
        }
        projects.push(project);
    }

    Ok(projects)
}

#[tauri::command]
pub fn project_set_active(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<(), String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM talk_projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("project_check: {e}"))?;
    if exists == 0 {
        return Err("project_not_found".to_string());
    }

    set_active_project_id(&conn, &project_id)?;
    Ok(())
}

fn fetch_project_by_id(
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

fn fetch_latest_project(conn: &rusqlite::Connection) -> Result<Option<ProjectSummary>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at
             FROM talk_projects
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

fn get_active_project_id(conn: &rusqlite::Connection) -> Result<Option<String>, String> {
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

fn set_active_project_id(conn: &rusqlite::Connection, project_id: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO active_state (id, active_project_id) VALUES (1, ?1)",
        params![project_id],
    )
    .map_err(|e| format!("active_set: {e}"))?;
    Ok(())
}

fn next_talk_number(conn: &rusqlite::Connection) -> Result<i64, String> {
    let max_value: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(talk_number), 0) FROM talk_projects",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("talk_number_max: {e}"))?;
    Ok(max_value + 1)
}
