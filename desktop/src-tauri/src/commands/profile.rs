use crate::core::{db, ids, models::ProfileSummary, time};
use rusqlite::params;
use std::path::Path;
use tauri::Manager;

#[tauri::command]
pub fn profile_list(app: tauri::AppHandle) -> Result<Vec<ProfileSummary>, String> {
    let conn = db::open_global(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, created_at, last_opened_at, is_active
             FROM profiles
             ORDER BY created_at ASC",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ProfileSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                last_opened_at: row.get(3)?,
                is_active: row.get::<_, i64>(4)? == 1,
                size_bytes: 0,
            })
        })
        .map_err(|e| format!("query: {e}"))?;

    let mut profiles = Vec::new();
    for row in rows {
        let mut profile = row.map_err(|e| format!("row: {e}"))?;
        if let Ok(profile_dir) = db::profile_dir(&app, &profile.id) {
            profile.size_bytes = dir_size(&profile_dir);
        }
        profiles.push(profile);
    }

    Ok(profiles)
}

fn dir_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    let mut total = 0;
    let entries = match std::fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return 0,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if let Ok(metadata) = entry.metadata() {
            if metadata.is_file() {
                total += metadata.len();
            } else if metadata.is_dir() {
                total += dir_size(&path);
            }
        }
    }
    total
}

#[tauri::command]
pub fn profile_create(app: tauri::AppHandle, name: String) -> Result<String, String> {
    let conn = db::open_global(&app)?;
    let existing: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM profiles WHERE name = ?1",
            params![name],
            |row| row.get(0),
        )
        .map_err(|e| format!("profile_check: {e}"))?;
    if existing > 0 {
        return Err("profile_name_exists".to_string());
    }
    let id = ids::new_id("prof");
    let now = time::now_rfc3339();

    conn.execute("UPDATE profiles SET is_active = 0", [])
        .map_err(|e| format!("deactivate: {e}"))?;
    conn.execute(
        "INSERT INTO profiles (id, name, created_at, last_opened_at, is_active)
         VALUES (?1, ?2, ?3, ?4, 1)",
        params![id, name, now, now],
    )
    .map_err(|e| format!("insert: {e}"))?;

    db::open_profile(&app, &id)?;

    Ok(id)
}

#[tauri::command]
pub fn profile_switch(app: tauri::AppHandle, profile_id: String) -> Result<(), String> {
    let conn = db::open_global(&app)?;
    let now = time::now_rfc3339();

    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM profiles WHERE id = ?1",
            params![profile_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("profile_check: {e}"))?;
    if exists == 0 {
        return Err("profile_not_found".to_string());
    }

    conn.execute("UPDATE profiles SET is_active = 0 WHERE is_active = 1", [])
        .map_err(|e| format!("deactivate: {e}"))?;

    conn.execute(
        "UPDATE profiles SET is_active = 1, last_opened_at = ?1 WHERE id = ?2",
        params![now, profile_id],
    )
    .map_err(|e| format!("activate: {e}"))?;

    db::open_profile(&app, &profile_id)?;

    Ok(())
}

#[tauri::command]
pub fn profile_rename(
    app: tauri::AppHandle,
    profile_id: String,
    name: String,
) -> Result<(), String> {
    let conn = db::open_global(&app)?;
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM profiles WHERE id = ?1",
            params![profile_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("profile_check: {e}"))?;
    if exists == 0 {
        return Err("profile_not_found".to_string());
    }

    let name_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM profiles WHERE name = ?1 AND id <> ?2",
            params![name, profile_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("name_check: {e}"))?;
    if name_exists > 0 {
        return Err("profile_name_exists".to_string());
    }

    conn.execute(
        "UPDATE profiles SET name = ?1 WHERE id = ?2",
        params![name, profile_id],
    )
    .map_err(|e| format!("rename: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn profile_delete(app: tauri::AppHandle, profile_id: String) -> Result<(), String> {
    let conn = db::open_global(&app)?;
    let (exists, is_active): (i64, i64) = conn
        .query_row(
            "SELECT COUNT(*), SUM(is_active) FROM profiles WHERE id = ?1",
            params![profile_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("profile_check: {e}"))?;
    if exists == 0 {
        return Err("profile_not_found".to_string());
    }

    conn.execute("DELETE FROM profiles WHERE id = ?1", params![profile_id])
        .map_err(|e| format!("delete: {e}"))?;

    let profile_dir = db::profile_dir(&app, &profile_id)?;
    if profile_dir.exists() {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("app_data_dir: {e}"))?
            .canonicalize()
            .map_err(|e| format!("canonicalize: {e}"))?;
        let canonical = profile_dir
            .canonicalize()
            .map_err(|e| format!("canonicalize: {e}"))?;
        if !canonical.starts_with(&app_data_dir) {
            return Err("path_not_allowed".to_string());
        }
        std::fs::remove_dir_all(&canonical).map_err(|e| format!("remove_dir: {e}"))?;
    }

    if is_active > 0 {
        if let Ok(next_id) = conn.query_row(
            "SELECT id FROM profiles ORDER BY created_at DESC LIMIT 1",
            [],
            |row| row.get::<_, String>(0),
        ) {
            let now = time::now_rfc3339();
            conn.execute("UPDATE profiles SET is_active = 0 WHERE is_active = 1", [])
                .map_err(|e| format!("deactivate: {e}"))?;
            conn.execute(
                "UPDATE profiles SET is_active = 1, last_opened_at = ?1 WHERE id = ?2",
                params![now, next_id],
            )
            .map_err(|e| format!("activate: {e}"))?;
        }
    }

    Ok(())
}
