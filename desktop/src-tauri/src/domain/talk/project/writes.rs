use super::repo;
use crate::kernel::models::{ProjectCreatePayload, ProjectUpdatePayload};
use crate::kernel::{ids, time};
use crate::platform::db;

pub fn project_create(
    app: &tauri::AppHandle,
    profile_id: &str,
    payload: ProjectCreatePayload,
) -> Result<String, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let id = ids::new_id("proj");
    let now = time::now_rfc3339();
    let talk_number = repo::next_talk_number(&conn)?;

    repo::insert_project(
        &conn,
        &repo::InsertProjectParams {
            id: &id,
            title: &payload.title,
            audience: payload.audience.as_deref(),
            goal: payload.goal.as_deref(),
            duration_target_sec: payload.duration_target_sec,
            talk_number,
            now: &now,
        },
    )?;
    repo::set_active_project_id(&conn, &id)?;

    Ok(id)
}

pub fn project_ensure_training(app: &tauri::AppHandle, profile_id: &str) -> Result<String, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    ensure_training_project(&conn)
}

pub fn project_update(
    app: &tauri::AppHandle,
    profile_id: &str,
    project_id: &str,
    payload: ProjectUpdatePayload,
) -> Result<(), String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let now = time::now_rfc3339();

    let title = payload.title.trim();
    if title.is_empty() {
        return Err("project_title_required".to_string());
    }
    if title.chars().count() > 120 {
        return Err("project_title_too_long".to_string());
    }

    let stage = payload.stage.trim();
    if stage.is_empty() {
        return Err("project_stage_required".to_string());
    }

    let audience = normalize_optional_text(payload.audience, 240);
    let goal = normalize_optional_text(payload.goal, 1000);
    let duration_target_sec = match payload.duration_target_sec {
        Some(value) if value > 0 => Some(value),
        Some(_) => return Err("project_duration_invalid".to_string()),
        None => None,
    };

    let updated = repo::update_project(
        &conn,
        &repo::UpdateProjectParams {
            project_id,
            title,
            audience: audience.as_deref(),
            goal: goal.as_deref(),
            duration_target_sec,
            stage,
            now: &now,
        },
    )?;
    if updated == 0 {
        return Err("project_not_found".to_string());
    }
    Ok(())
}

pub fn project_set_active(
    app: &tauri::AppHandle,
    profile_id: &str,
    project_id: &str,
) -> Result<(), String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;

    let row = repo::select_project_training_state(&conn, project_id)?;
    let Some(is_training) = row else {
        return Err("project_not_found".to_string());
    };
    if is_training > 0 {
        return Err("project_training_not_activatable".to_string());
    }

    repo::set_active_project_id(&conn, project_id)?;
    Ok(())
}

fn ensure_training_project(conn: &rusqlite::Connection) -> Result<String, String> {
    if let Some(id) = repo::find_training_project_id(conn)? {
        return Ok(id);
    }

    let id = ids::new_id("proj");
    let now = time::now_rfc3339();
    repo::insert_training_project(conn, &id, &now)?;

    Ok(id)
}

fn normalize_optional_text(value: Option<String>, max_len: usize) -> Option<String> {
    let trimmed = value.as_deref().map(str::trim).unwrap_or("");
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.chars().take(max_len).collect())
}
