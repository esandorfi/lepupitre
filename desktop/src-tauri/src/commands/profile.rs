use crate::core::{db, ids, models::ProfileSummary, time};
use rusqlite::params;

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
            })
        })
        .map_err(|e| format!("query: {e}"))?;

    let mut profiles = Vec::new();
    for row in rows {
        profiles.push(row.map_err(|e| format!("row: {e}"))?);
    }

    Ok(profiles)
}

#[tauri::command]
pub fn profile_create(app: tauri::AppHandle, name: String) -> Result<String, String> {
    let conn = db::open_global(&app)?;
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

    let updated = conn
        .execute("UPDATE profiles SET is_active = 0 WHERE is_active = 1", [])
        .map_err(|e| format!("deactivate: {e}"))?;

    let changed = conn
        .execute(
            "UPDATE profiles SET is_active = 1, last_opened_at = ?1 WHERE id = ?2",
            params![now, profile_id],
        )
        .map_err(|e| format!("activate: {e}"))?;

    if changed == 0 && updated == 0 {
        return Err("profile_not_found".to_string());
    }

    db::open_profile(&app, &profile_id)?;

    Ok(())
}
