mod queries;
mod repo;

use crate::core::db;
use tauri::AppHandle;

pub fn preference_global_get(app: &AppHandle, key: &str) -> Result<Option<String>, String> {
    let validated_key = repo::validate_key(key)?;
    let conn = db::open_global(app)?;
    repo::get_setting(&conn, "global_settings", validated_key)
}

pub fn preference_global_set(
    app: &AppHandle,
    key: &str,
    value: Option<&str>,
) -> Result<(), String> {
    let validated_key = repo::validate_key(key)?;
    repo::validate_value(value)?;
    let conn = db::open_global(app)?;
    repo::set_setting(&conn, "global_settings", validated_key, value)
}

pub fn preference_profile_get(
    app: &AppHandle,
    profile_id: &str,
    key: &str,
) -> Result<Option<String>, String> {
    let validated_key = repo::validate_key(key)?;
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::get_setting(&conn, "profile_settings", validated_key)
}

pub fn preference_profile_set(
    app: &AppHandle,
    profile_id: &str,
    key: &str,
    value: Option<&str>,
) -> Result<(), String> {
    let validated_key = repo::validate_key(key)?;
    repo::validate_value(value)?;
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    repo::set_setting(&conn, "profile_settings", validated_key, value)
}
