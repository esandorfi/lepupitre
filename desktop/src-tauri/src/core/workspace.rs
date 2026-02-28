use crate::core::{db, ids, models::ProfileSummary, time};
use rusqlite::{params, Connection};
use std::path::Path;
use tauri::{AppHandle, Manager};

pub fn profile_list(app: &AppHandle) -> Result<Vec<ProfileSummary>, String> {
    let conn = db::open_global(app)?;
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
                talks_count: 0,
            })
        })
        .map_err(|e| format!("query: {e}"))?;

    let mut profiles = Vec::new();
    for row in rows {
        let mut profile = row.map_err(|e| format!("row: {e}"))?;
        if let Ok(profile_dir) = db::profile_dir(app, &profile.id) {
            profile.size_bytes = dir_size(&profile_dir);
        }
        if let Ok(profile_conn) = db::open_profile(app, &profile.id) {
            profile.talks_count = talk_count(&profile_conn);
        }
        profiles.push(profile);
    }

    Ok(profiles)
}

fn profile_create_row(
    conn: &mut Connection,
    name: &str,
    id: &str,
    now: &str,
) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| format!("tx_create: {e}"))?;
    let existing: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM profiles WHERE name = ?1",
            params![name],
            |row| row.get(0),
        )
        .map_err(|e| format!("profile_check: {e}"))?;
    if existing > 0 {
        return Err("profile_name_exists".to_string());
    }

    tx.execute("UPDATE profiles SET is_active = 0", [])
        .map_err(|e| format!("deactivate: {e}"))?;
    tx.execute(
        "INSERT INTO profiles (id, name, created_at, last_opened_at, is_active)
         VALUES (?1, ?2, ?3, ?4, 1)",
        params![id, name, now, now],
    )
    .map_err(|e| format!("insert: {e}"))?;
    tx.commit().map_err(|e| format!("tx_create_commit: {e}"))?;
    Ok(())
}

fn profile_switch_row(conn: &mut Connection, profile_id: &str, now: &str) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| format!("tx_switch: {e}"))?;
    let exists: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM profiles WHERE id = ?1",
            params![profile_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("profile_check: {e}"))?;
    if exists == 0 {
        return Err("profile_not_found".to_string());
    }

    tx.execute("UPDATE profiles SET is_active = 0 WHERE is_active = 1", [])
        .map_err(|e| format!("deactivate: {e}"))?;

    tx.execute(
        "UPDATE profiles SET is_active = 1, last_opened_at = ?1 WHERE id = ?2",
        params![now, profile_id],
    )
    .map_err(|e| format!("activate: {e}"))?;
    tx.commit().map_err(|e| format!("tx_switch_commit: {e}"))?;
    Ok(())
}

fn profile_delete_row(conn: &mut Connection, profile_id: &str, now: &str) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| format!("tx_delete: {e}"))?;
    let (exists, is_active): (i64, i64) = tx
        .query_row(
            "SELECT COUNT(*), SUM(is_active) FROM profiles WHERE id = ?1",
            params![profile_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("profile_check: {e}"))?;
    if exists == 0 {
        return Err("profile_not_found".to_string());
    }

    tx.execute("DELETE FROM profiles WHERE id = ?1", params![profile_id])
        .map_err(|e| format!("delete: {e}"))?;

    if is_active > 0 {
        let next_id: Option<String> = tx
            .query_row(
                "SELECT id FROM profiles ORDER BY created_at DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .ok();
        if let Some(next_id) = next_id {
            tx.execute("UPDATE profiles SET is_active = 0 WHERE is_active = 1", [])
                .map_err(|e| format!("deactivate: {e}"))?;
            tx.execute(
                "UPDATE profiles SET is_active = 1, last_opened_at = ?1 WHERE id = ?2",
                params![now, next_id],
            )
            .map_err(|e| format!("activate: {e}"))?;
        }
    }

    tx.commit().map_err(|e| format!("tx_delete_commit: {e}"))?;
    Ok(())
}

pub fn profile_create(app: &AppHandle, name: &str) -> Result<String, String> {
    let mut conn = db::open_global(app)?;
    let id = ids::new_id("prof");
    let now = time::now_rfc3339();
    profile_create_row(&mut conn, name, &id, &now)?;

    db::open_profile(app, &id)?;

    Ok(id)
}

pub fn profile_switch(app: &AppHandle, profile_id: &str) -> Result<(), String> {
    let mut conn = db::open_global(app)?;
    let now = time::now_rfc3339();
    profile_switch_row(&mut conn, profile_id, &now)?;

    db::open_profile(app, profile_id)?;

    Ok(())
}

pub fn profile_rename(app: &AppHandle, profile_id: &str, name: &str) -> Result<(), String> {
    let conn = db::open_global(app)?;
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

pub fn profile_delete(app: &AppHandle, profile_id: &str) -> Result<(), String> {
    let mut conn = db::open_global(app)?;
    let now = time::now_rfc3339();
    profile_delete_row(&mut conn, profile_id, &now)?;

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

fn talk_count(conn: &rusqlite::Connection) -> u64 {
    conn.query_row(
        "SELECT COUNT(*) FROM talk_projects WHERE COALESCE(is_training, 0) = 0",
        [],
        |row| row.get::<_, u64>(0),
    )
    .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "CREATE TABLE profiles (
               id TEXT PRIMARY KEY,
               name TEXT NOT NULL UNIQUE,
               created_at TEXT NOT NULL,
               last_opened_at TEXT NOT NULL,
               is_active INTEGER NOT NULL DEFAULT 0
             );",
        )
        .expect("schema");
        conn
    }

    #[test]
    fn create_profile_rolls_back_on_insert_failure() {
        let mut conn = test_conn();
        conn.execute(
            "INSERT INTO profiles (id, name, created_at, last_opened_at, is_active)
             VALUES (?1, ?2, ?3, ?4, 1)",
            params![
                "prof_existing",
                "Existing",
                "2026-02-28T00:00:00Z",
                "2026-02-28T00:00:00Z"
            ],
        )
        .expect("seed active");
        conn.execute(
            "INSERT INTO profiles (id, name, created_at, last_opened_at, is_active)
             VALUES (?1, ?2, ?3, ?4, 0)",
            params![
                "prof_conflict",
                "Conflict Holder",
                "2026-02-28T00:00:01Z",
                "2026-02-28T00:00:01Z"
            ],
        )
        .expect("seed conflicting id");

        let err = profile_create_row(
            &mut conn,
            "New Profile",
            "prof_conflict",
            "2026-02-28T00:00:02Z",
        )
        .expect_err("insert should fail");
        assert!(err.contains("insert:"));

        let active_id: String = conn
            .query_row("SELECT id FROM profiles WHERE is_active = 1", [], |row| {
                row.get(0)
            })
            .expect("active stays unchanged");
        assert_eq!(active_id, "prof_existing");
    }

    #[test]
    fn switch_profile_rolls_back_on_activate_failure() {
        let mut conn = test_conn();
        conn.execute(
            "INSERT INTO profiles (id, name, created_at, last_opened_at, is_active)
             VALUES (?1, ?2, ?3, ?4, 1)",
            params![
                "prof_a",
                "A",
                "2026-02-28T00:00:00Z",
                "2026-02-28T00:00:00Z"
            ],
        )
        .expect("seed a");
        conn.execute(
            "INSERT INTO profiles (id, name, created_at, last_opened_at, is_active)
             VALUES (?1, ?2, ?3, ?4, 0)",
            params![
                "prof_b",
                "B",
                "2026-02-28T00:00:01Z",
                "2026-02-28T00:00:01Z"
            ],
        )
        .expect("seed b");
        conn.execute_batch(
            "CREATE TRIGGER fail_activate_prof_b
             BEFORE UPDATE OF is_active ON profiles
             WHEN NEW.id = 'prof_b' AND NEW.is_active = 1
             BEGIN
               SELECT RAISE(FAIL, 'activate blocked');
             END;",
        )
        .expect("trigger");

        let err = profile_switch_row(&mut conn, "prof_b", "2026-02-28T00:00:02Z")
            .expect_err("activation should fail");
        assert!(err.contains("activate:"));

        let active_id: String = conn
            .query_row("SELECT id FROM profiles WHERE is_active = 1", [], |row| {
                row.get(0)
            })
            .expect("active stays original");
        assert_eq!(active_id, "prof_a");
    }

    #[test]
    fn delete_profile_rolls_back_on_fallback_activate_failure() {
        let mut conn = test_conn();
        conn.execute(
            "INSERT INTO profiles (id, name, created_at, last_opened_at, is_active)
             VALUES (?1, ?2, ?3, ?4, 1)",
            params![
                "prof_active",
                "Active",
                "2026-02-28T00:00:00Z",
                "2026-02-28T00:00:00Z"
            ],
        )
        .expect("seed active");
        conn.execute(
            "INSERT INTO profiles (id, name, created_at, last_opened_at, is_active)
             VALUES (?1, ?2, ?3, ?4, 0)",
            params![
                "prof_fallback",
                "Fallback",
                "2026-02-28T00:00:01Z",
                "2026-02-28T00:00:01Z"
            ],
        )
        .expect("seed fallback");
        conn.execute_batch(
            "CREATE TRIGGER fail_activate_fallback
             BEFORE UPDATE OF is_active ON profiles
             WHEN NEW.id = 'prof_fallback' AND NEW.is_active = 1
             BEGIN
               SELECT RAISE(FAIL, 'fallback activate blocked');
             END;",
        )
        .expect("trigger");

        let err = profile_delete_row(&mut conn, "prof_active", "2026-02-28T00:00:02Z")
            .expect_err("fallback activation should fail");
        assert!(err.contains("activate:"));

        let active_id: String = conn
            .query_row("SELECT id FROM profiles WHERE is_active = 1", [], |row| {
                row.get(0)
            })
            .expect("active restored");
        assert_eq!(active_id, "prof_active");

        let active_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM profiles WHERE id = 'prof_active'",
                [],
                |row| row.get(0),
            )
            .expect("active row count");
        assert_eq!(active_exists, 1);
    }
}
