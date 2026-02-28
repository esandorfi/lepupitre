use rusqlite::{params, Connection, OptionalExtension};

const GLOBAL_MIGRATION: &str = include_str!("../../../migrations/global/0001_init.sql");

fn create_profile(conn: &Connection, id: &str, name: &str, now: &str) -> Result<(), String> {
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
    conn.execute("UPDATE profiles SET is_active = 0", [])
        .map_err(|e| format!("deactivate: {e}"))?;
    conn.execute(
        "INSERT INTO profiles (id, name, created_at, last_opened_at, is_active)
         VALUES (?1, ?2, ?3, ?4, 1)",
        params![id, name, now, now],
    )
    .map_err(|e| format!("insert: {e}"))?;
    Ok(())
}

fn switch_profile(conn: &Connection, profile_id: &str, now: &str) -> Result<(), String> {
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
    Ok(())
}

fn rename_profile(conn: &Connection, profile_id: &str, name: &str) -> Result<(), String> {
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

fn delete_profile(conn: &Connection, profile_id: &str, now: &str) -> Result<(), String> {
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

    if is_active > 0 {
        let next_id: Option<String> = conn
            .query_row(
                "SELECT id FROM profiles ORDER BY created_at DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("fallback_lookup: {e}"))?;
        if let Some(next_id) = next_id {
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

#[test]
fn workspace_create_switch_rename_delete_flow_is_consistent() {
    let conn = Connection::open_in_memory().expect("open");
    conn.execute_batch(GLOBAL_MIGRATION).expect("migrate");

    create_profile(&conn, "prof_a", "Alice", "2026-02-28T10:00:00Z").expect("create_a");
    create_profile(&conn, "prof_b", "Bob", "2026-02-28T10:01:00Z").expect("create_b");

    let active_after_create: String = conn
        .query_row("SELECT id FROM profiles WHERE is_active = 1", [], |row| {
            row.get(0)
        })
        .expect("active after create");
    assert_eq!(active_after_create, "prof_b");

    switch_profile(&conn, "prof_a", "2026-02-28T10:02:00Z").expect("switch");
    let active_after_switch: String = conn
        .query_row("SELECT id FROM profiles WHERE is_active = 1", [], |row| {
            row.get(0)
        })
        .expect("active after switch");
    assert_eq!(active_after_switch, "prof_a");

    rename_profile(&conn, "prof_a", "Alice Prime").expect("rename");
    let renamed: String = conn
        .query_row("SELECT name FROM profiles WHERE id = 'prof_a'", [], |row| {
            row.get(0)
        })
        .expect("renamed");
    assert_eq!(renamed, "Alice Prime");

    let duplicate = rename_profile(&conn, "prof_a", "Bob");
    assert_eq!(duplicate.err().as_deref(), Some("profile_name_exists"));

    delete_profile(&conn, "prof_a", "2026-02-28T10:03:00Z").expect("delete");
    let active_after_delete: String = conn
        .query_row("SELECT id FROM profiles WHERE is_active = 1", [], |row| {
            row.get(0)
        })
        .expect("active after delete");
    assert_eq!(active_after_delete, "prof_b");
}

#[test]
fn workspace_switch_unknown_profile_is_rejected() {
    let conn = Connection::open_in_memory().expect("open");
    conn.execute_batch(GLOBAL_MIGRATION).expect("migrate");
    let err =
        switch_profile(&conn, "missing", "2026-02-28T11:00:00Z").expect_err("switch should fail");
    assert_eq!(err, "profile_not_found");
}
