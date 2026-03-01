mod repo;

use crate::kernel::models::ProfileSummary;
use crate::kernel::{ids, time};
use crate::platform::db;
use std::path::Path;
use tauri::{AppHandle, Manager};

pub fn profile_list(app: &AppHandle) -> Result<Vec<ProfileSummary>, String> {
    let conn = db::open_global(app)?;
    let mut profiles = repo::select_profiles(&conn)?;

    for profile in &mut profiles {
        if let Ok(profile_dir) = db::profile_dir(app, &profile.id) {
            profile.size_bytes = dir_size(&profile_dir);
        }
        if let Ok(profile_conn) = db::open_profile(app, &profile.id) {
            profile.talks_count = repo::talk_count(&profile_conn);
        }
    }

    Ok(profiles)
}

pub fn profile_create(app: &AppHandle, name: &str) -> Result<String, String> {
    let mut conn = db::open_global(app)?;
    let id = ids::new_id("prof");
    let now = time::now_rfc3339();
    repo::profile_create_row(&mut conn, name, &id, &now)?;

    db::open_profile(app, &id)?;

    Ok(id)
}

pub fn profile_switch(app: &AppHandle, profile_id: &str) -> Result<(), String> {
    let mut conn = db::open_global(app)?;
    let now = time::now_rfc3339();
    repo::profile_switch_row(&mut conn, profile_id, &now)?;

    db::open_profile(app, profile_id)?;

    Ok(())
}

pub fn profile_rename(app: &AppHandle, profile_id: &str, name: &str) -> Result<(), String> {
    let conn = db::open_global(app)?;
    repo::rename_profile(&conn, profile_id, name)
}

pub fn profile_delete(app: &AppHandle, profile_id: &str) -> Result<(), String> {
    let mut conn = db::open_global(app)?;
    let now = time::now_rfc3339();
    repo::profile_delete_row(&mut conn, profile_id, &now)?;

    let profile_dir = db::profile_dir(app, profile_id)?;
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

    Ok(())
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
