use crate::core::{db, ids, models::ProjectCreatePayload, models::ProjectSummary, time};
use rusqlite::params;

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

    conn.execute(
        "INSERT INTO talk_projects (id, title, audience, goal, duration_target_sec, stage, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            payload.title,
            payload.audience,
            payload.goal,
            payload.duration_target_sec,
            "draft",
            now,
            now
        ],
    )
    .map_err(|e| format!("insert: {e}"))?;

    Ok(id)
}

#[tauri::command]
pub fn project_get_active(
    app: tauri::AppHandle,
    profile_id: String,
) -> Result<Option<ProjectSummary>, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, audience, goal, duration_target_sec, stage, created_at, updated_at
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
            stage: row.get(5).map_err(|e| format!("stage: {e}"))?,
            created_at: row.get(6).map_err(|e| format!("created_at: {e}"))?,
            updated_at: row.get(7).map_err(|e| format!("updated_at: {e}"))?,
        };
        return Ok(Some(summary));
    }

    Ok(None)
}
