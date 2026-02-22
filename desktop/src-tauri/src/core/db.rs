use crate::core::seed::QuestSeedFile;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use tauri::Manager;

const GLOBAL_MIGRATION: &str = include_str!("../../../../migrations/global/0001_init.sql");
const PROFILE_MIGRATION: &str = include_str!("../../../../migrations/profile/0001_init.sql");
const QUESTS_SEED: &str = include_str!("../../../../seed/quests.v1.json");

pub fn open_global(app: &tauri::AppHandle) -> Result<Connection, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| format!("create_dir: {e}"))?;

    let db_path = app_data_dir.join("global.db");
    let conn = Connection::open(&db_path).map_err(|e| format!("open: {e}"))?;
    conn.execute_batch(GLOBAL_MIGRATION)
        .map_err(|e| format!("migrate: {e}"))?;
    Ok(conn)
}

pub fn ensure_profile_exists(app: &tauri::AppHandle, profile_id: &str) -> Result<(), String> {
    let conn = open_global(app)?;
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM profiles WHERE id = ?1",
            [profile_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("profile_check: {e}"))?;
    if count == 0 {
        return Err("profile_not_found".to_string());
    }
    Ok(())
}

pub fn open_profile(app: &tauri::AppHandle, profile_id: &str) -> Result<Connection, String> {
    let profile_dir = profile_dir(app, profile_id)?;
    std::fs::create_dir_all(&profile_dir).map_err(|e| format!("create_dir: {e}"))?;

    let db_path = profile_dir.join("profile.db");
    let mut conn = Connection::open(&db_path).map_err(|e| format!("open: {e}"))?;
    conn.execute_batch(PROFILE_MIGRATION)
        .map_err(|e| format!("migrate: {e}"))?;

    seed_quests(&mut conn)?;
    ensure_talk_numbers(&mut conn)?;

    Ok(conn)
}

pub fn profile_dir(app: &tauri::AppHandle, profile_id: &str) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    Ok(app_data_dir.join("profiles").join(profile_id))
}

fn seed_quests(conn: &mut Connection) -> Result<(), String> {
    let seed: QuestSeedFile =
        serde_json::from_str(QUESTS_SEED).map_err(|e| format!("seed_parse: {e}"))?;
    if seed.schema_version != "1.0.0" {
        return Err("seed_version_mismatch".to_string());
    }

    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    for quest in seed.quests {
        let exists: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM quests WHERE code = ?1",
                [quest.code.as_str()],
                |row| row.get(0),
            )
            .map_err(|e| format!("seed_check: {e}"))?;
        if exists > 0 {
            continue;
        }
        let targets =
            serde_json::to_string(&quest.targets_issues).map_err(|e| format!("targets: {e}"))?;
        tx.execute(
            "INSERT INTO quests (code, title, category, estimated_sec, prompt, output_type, targets_issues_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                quest.code,
                quest.title,
                quest.category,
                quest.estimated_sec,
                quest.prompt,
                quest.output_type,
                targets
            ],
        )
        .map_err(|e| format!("insert_quest: {e}"))?;
    }
    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(())
}

fn ensure_talk_numbers(conn: &mut Connection) -> Result<(), String> {
    let has_column: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('talk_projects') WHERE name = 'talk_number'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("talk_number_check: {e}"))?;
    if has_column == 0 {
        conn.execute(
            "ALTER TABLE talk_projects ADD COLUMN talk_number INTEGER",
            [],
        )
        .map_err(|e| format!("talk_number_add: {e}"))?;
    }

    let max_existing: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(talk_number), 0) FROM talk_projects WHERE talk_number > 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("talk_number_max: {e}"))?;

    let mut next_number = max_existing + 1;
    let mut stmt = conn
        .prepare(
            "SELECT id FROM talk_projects
             WHERE talk_number IS NULL OR talk_number <= 0
             ORDER BY created_at ASC",
        )
        .map_err(|e| format!("talk_number_prepare: {e}"))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("talk_number_query: {e}"))?;

    for row in rows {
        let id = row.map_err(|e| format!("talk_number_row: {e}"))?;
        conn.execute(
            "UPDATE talk_projects SET talk_number = ?1 WHERE id = ?2",
            params![next_number, id],
        )
        .map_err(|e| format!("talk_number_update: {e}"))?;
        next_number += 1;
    }

    Ok(())
}
