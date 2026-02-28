use crate::core::preferences::queries;
use rusqlite::{params, Connection, OptionalExtension};

const MAX_KEY_LEN: usize = 160;
const MAX_VALUE_LEN: usize = 32_768;
const SENSITIVE_KEY_FRAGMENTS: &[&str] = &[
    "token",
    "secret",
    "password",
    "credential",
    "api_key",
    "apikey",
    "private_key",
];

pub(super) fn validate_key(key: &str) -> Result<&str, String> {
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
    if contains_sensitive_fragment(trimmed) {
        return Err("preference_key_sensitive_forbidden".to_string());
    }
    Ok(trimmed)
}

fn contains_sensitive_fragment(key: &str) -> bool {
    let normalized = key
        .to_ascii_lowercase()
        .chars()
        .map(|ch| {
            if matches!(ch, '.' | '-' | ':') {
                '_'
            } else {
                ch
            }
        })
        .collect::<String>();
    SENSITIVE_KEY_FRAGMENTS
        .iter()
        .any(|fragment| normalized.contains(fragment))
}

pub(super) fn validate_value(value: Option<&str>) -> Result<(), String> {
    if let Some(v) = value {
        if v.len() > MAX_VALUE_LEN {
            return Err("preference_value_too_large".to_string());
        }
    }
    Ok(())
}

pub(super) fn get_setting(
    conn: &Connection,
    table: &str,
    key: &str,
) -> Result<Option<String>, String> {
    let query = queries::select_setting(table);
    conn.query_row(&query, params![key], |row| row.get::<_, String>(0))
        .optional()
        .map_err(|e| format!("preference_get: {e}"))
}

pub(super) fn set_setting(
    conn: &Connection,
    table: &str,
    key: &str,
    value: Option<&str>,
) -> Result<(), String> {
    match value {
        Some(v) => {
            let query = queries::upsert_setting(table);
            conn.execute(&query, params![key, v])
                .map_err(|e| format!("preference_set: {e}"))?;
        }
        None => {
            let query = queries::delete_setting(table);
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
    fn sensitive_key_fragments_are_rejected() {
        assert_eq!(
            validate_key("lepupitre.api_token").expect_err("token should fail"),
            "preference_key_sensitive_forbidden"
        );
        assert_eq!(
            validate_key("lepupitre:client-secret").expect_err("secret should fail"),
            "preference_key_sensitive_forbidden"
        );
        assert_eq!(
            validate_key("lepupitre.private-key").expect_err("private key should fail"),
            "preference_key_sensitive_forbidden"
        );
        assert!(validate_key("lepupitre.locale").is_ok());
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
