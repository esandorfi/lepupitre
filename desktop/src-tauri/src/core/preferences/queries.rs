pub(super) fn select_setting(table: &str) -> String {
    format!("SELECT value_json FROM {table} WHERE key = ?1")
}

pub(super) fn upsert_setting(table: &str) -> String {
    format!(
        "INSERT INTO {table} (key, value_json) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json"
    )
}

pub(super) fn delete_setting(table: &str) -> String {
    format!("DELETE FROM {table} WHERE key = ?1")
}
