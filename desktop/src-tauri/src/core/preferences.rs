use crate::core::db;
use rusqlite::{params, Connection, OptionalExtension};
use tauri::AppHandle;

const MAX_KEY_LEN: usize = 160;
const MAX_VALUE_LEN: usize = 32_768;

pub fn preference_global_get(app: &AppHandle, key: &str) -> Result<Option<String>, String> {
    let validated_key = validate_key(key)?;
    let conn = db::open_global(app)?;
    get_setting(&conn, "global_settings", validated_key)
}

pub fn preference_global_set(
    app: &AppHandle,
    key: &str,
    value: Option<&str>,
) -> Result<(), String> {
    let validated_key = validate_key(key)?;
    validate_value(value)?;
    let conn = db::open_global(app)?;
    set_setting(&conn, "global_settings", validated_key, value)
}

pub fn preference_profile_get(
    app: &AppHandle,
    profile_id: &str,
    key: &str,
) -> Result<Option<String>, String> {
    let validated_key = validate_key(key)?;
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    get_setting(&conn, "profile_settings", validated_key)
}

pub fn preference_profile_set(
    app: &AppHandle,
    profile_id: &str,
    key: &str,
    value: Option<&str>,
) -> Result<(), String> {
    let validated_key = validate_key(key)?;
    validate_value(value)?;
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    set_setting(&conn, "profile_settings", validated_key, value)
}

fn validate_key(key: &str) -> Result<&str, String> {
    let trimmed = key.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_KEY_LEN {
        return Err("preference_key_invalid".to_string());
    }
    if !trimmed
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-' | ':'))
    {
        return Err("preference_key_invalid".to_string());
    }
    Ok(trimmed)
}

fn validate_value(value: Option<&str>) -> Result<(), String> {
    if let Some(v) = value {
        if v.len() > MAX_VALUE_LEN {
            return Err("preference_value_too_large".to_string());
        }
    }
    Ok(())
}

fn get_setting(conn: &Connection, table: &str, key: &str) -> Result<Option<String>, String> {
    let query = format!("SELECT value_json FROM {table} WHERE key = ?1");
    conn.query_row(&query, params![key], |row| row.get::<_, String>(0))
        .optional()
        .map_err(|e| format!("preference_get: {e}"))
}

fn set_setting(
    conn: &Connection,
    table: &str,
    key: &str,
    value: Option<&str>,
) -> Result<(), String> {
    match value {
        Some(v) => {
            let query = format!(
                "INSERT INTO {table} (key, value_json) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json"
            );
            conn.execute(&query, params![key, v])
                .map_err(|e| format!("preference_set: {e}"))?;
        }
        None => {
            let query = format!("DELETE FROM {table} WHERE key = ?1");
            conn.execute(&query, params![key])
                .map_err(|e| format!("preference_remove: {e}"))?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn setting_roundtrip_works() {
        let conn = Connection::open_in_memory().expect("open");
        conn.execute(
            "CREATE TABLE global_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL)",
            [],
        )
        .expect("create");

        set_setting(&conn, "global_settings", "lepupitre.locale", Some("\"fr\"")).expect("set");
        let read = get_setting(&conn, "global_settings", "lepupitre.locale").expect("get");
        assert_eq!(read.as_deref(), Some("\"fr\""));
    }

    #[test]
    fn removing_setting_deletes_row() {
        let conn = Connection::open_in_memory().expect("open");
        conn.execute(
            "CREATE TABLE global_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL)",
            [],
        )
        .expect("create");

        set_setting(
            &conn,
            "global_settings",
            "lepupitre.theme",
            Some("terminal"),
        )
        .expect("set");
        set_setting(&conn, "global_settings", "lepupitre.theme", None).expect("remove");
        let read = get_setting(&conn, "global_settings", "lepupitre.theme").expect("get");
        assert!(read.is_none());
    }

    #[test]
    fn invalid_key_is_rejected() {
        assert!(validate_key("").is_err());
        assert!(validate_key("   ").is_err());
        assert!(validate_key("bad key").is_err());
        assert!(validate_key(&"k".repeat(MAX_KEY_LEN + 1)).is_err());
    }

    #[test]
    fn profile_tables_are_isolated() {
        let conn_a = Connection::open_in_memory().expect("open_a");
        let conn_b = Connection::open_in_memory().expect("open_b");
        conn_a
            .execute(
                "CREATE TABLE profile_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL)",
                [],
            )
            .expect("create_a");
        conn_b
            .execute(
                "CREATE TABLE profile_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL)",
                [],
            )
            .expect("create_b");

        set_setting(&conn_a, "profile_settings", "lepupitre.hero", Some("Q-1")).expect("set_a");
        set_setting(&conn_b, "profile_settings", "lepupitre.hero", Some("Q-2")).expect("set_b");

        let a = get_setting(&conn_a, "profile_settings", "lepupitre.hero").expect("get_a");
        let b = get_setting(&conn_b, "profile_settings", "lepupitre.hero").expect("get_b");
        assert_eq!(a.as_deref(), Some("Q-1"));
        assert_eq!(b.as_deref(), Some("Q-2"));
    }
}
