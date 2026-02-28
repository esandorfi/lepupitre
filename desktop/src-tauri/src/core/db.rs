use crate::core::db_helpers;
use crate::core::seed::QuestSeedFile;
use crate::core::time;
use rusqlite::{params, Connection, ErrorCode};
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::Duration;
use tauri::Manager;

const SQLITE_BUSY_TIMEOUT_MS: u64 = 2000;
const GLOBAL_MIGRATION: &str = include_str!("../../../../migrations/global/0001_init.sql");
const PROFILE_MIGRATION: &str = include_str!("../../../../migrations/profile/0001_init.sql");
const QUESTS_SEED: &str = include_str!("../../../../seed/quests.v1.json");

static GLOBAL_MIGRATION_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
static PROFILE_MIGRATION_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

type MigrationFn = fn(&mut Connection) -> Result<(), String>;

struct Migration {
    version: &'static str,
    apply: MigrationFn,
}

const GLOBAL_MIGRATIONS: &[Migration] = &[Migration {
    version: "0001_init",
    apply: migration_global_0001_init,
}];

const PROFILE_MIGRATIONS: &[Migration] = &[
    Migration {
        version: "0001_init",
        apply: migration_profile_0001_init,
    },
    Migration {
        version: "0002_outline_and_settings",
        apply: migration_profile_0002_outline_and_settings,
    },
    Migration {
        version: "0003_talk_training_flag",
        apply: migration_profile_0003_talk_training_flag,
    },
    Migration {
        version: "0004_talk_numbers_backfill",
        apply: migration_profile_0004_talk_numbers_backfill,
    },
    Migration {
        version: "0005_runs_audio_nullable",
        apply: migration_profile_0005_runs_audio_nullable,
    },
    Migration {
        version: "0006_seed_quests",
        apply: migration_profile_0006_seed_quests,
    },
];

pub fn open_global(app: &tauri::AppHandle) -> Result<Connection, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| format!("create_dir: {e}"))?;

    let db_path = app_data_dir.join("global.db");
    let mut conn = Connection::open(&db_path).map_err(|e| format!("open: {e}"))?;
    configure_connection_pragmas(&conn)?;

    let lock = GLOBAL_MIGRATION_LOCK.get_or_init(|| Mutex::new(()));
    let _guard = lock
        .lock()
        .map_err(|_| "global_migration_lock".to_string())?;
    apply_migrations(&mut conn, "global", GLOBAL_MIGRATIONS)?;
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
    configure_connection_pragmas(&conn)?;

    let lock = PROFILE_MIGRATION_LOCK.get_or_init(|| Mutex::new(()));
    let _guard = lock
        .lock()
        .map_err(|_| "profile_migration_lock".to_string())?;
    apply_migrations(&mut conn, "profile", PROFILE_MIGRATIONS)?;

    Ok(conn)
}

pub fn profile_dir(app: &tauri::AppHandle, profile_id: &str) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    Ok(app_data_dir.join("profiles").join(profile_id))
}

fn migration_global_0001_init(conn: &mut Connection) -> Result<(), String> {
    conn.execute_batch(GLOBAL_MIGRATION)
        .map_err(|e| format!("migrate_global_0001: {e}"))
}

fn migration_profile_0001_init(conn: &mut Connection) -> Result<(), String> {
    conn.execute_batch(PROFILE_MIGRATION)
        .map_err(|e| format!("migrate_profile_0001: {e}"))
}

fn migration_profile_0002_outline_and_settings(conn: &mut Connection) -> Result<(), String> {
    ensure_outline_table(conn)?;
    ensure_profile_settings_table(conn)?;
    Ok(())
}

fn migration_profile_0003_talk_training_flag(conn: &mut Connection) -> Result<(), String> {
    ensure_talk_training_flag(conn)
}

fn migration_profile_0004_talk_numbers_backfill(conn: &mut Connection) -> Result<(), String> {
    ensure_talk_numbers(conn)
}

fn migration_profile_0005_runs_audio_nullable(conn: &mut Connection) -> Result<(), String> {
    ensure_runs_nullable(conn)
}

fn migration_profile_0006_seed_quests(conn: &mut Connection) -> Result<(), String> {
    seed_quests(conn)
}

fn apply_migrations(
    conn: &mut Connection,
    scope: &str,
    migrations: &[Migration],
) -> Result<(), String> {
    ensure_schema_migrations_table(conn)?;
    let applied = load_applied_migrations(conn)?;
    validate_migration_continuity(scope, &applied, migrations)?;

    for migration in migrations.iter().skip(applied.len()) {
        (migration.apply)(conn)?;
        record_migration(conn, migration.version)?;
    }

    Ok(())
}

fn ensure_schema_migrations_table(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
           version TEXT PRIMARY KEY,
           applied_at TEXT NOT NULL
         )",
        [],
    )
    .map_err(|e| format!("schema_migrations_table: {e}"))?;
    Ok(())
}

fn load_applied_migrations(conn: &Connection) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
        .map_err(|e| format!("schema_migrations_prepare: {e}"))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("schema_migrations_query: {e}"))?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| format!("schema_migrations_row: {e}"))?);
    }
    Ok(out)
}

fn validate_migration_continuity(
    scope: &str,
    applied: &[String],
    migrations: &[Migration],
) -> Result<(), String> {
    if applied.len() > migrations.len() {
        return Err(format!(
            "migration_continuity_{scope}: too_many_applied_versions"
        ));
    }

    for (idx, applied_version) in applied.iter().enumerate() {
        let expected = migrations[idx].version;
        if applied_version != expected {
            return Err(format!(
                "migration_continuity_{scope}: expected {expected}, found {applied_version}"
            ));
        }
    }

    Ok(())
}

fn record_migration(conn: &Connection, version: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
        params![version, time::now_rfc3339()],
    )
    .map_err(|e| format!("schema_migrations_insert: {e}"))?;
    Ok(())
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

fn configure_connection_pragmas(conn: &Connection) -> Result<(), String> {
    conn.busy_timeout(Duration::from_millis(SQLITE_BUSY_TIMEOUT_MS))
        .map_err(|e| format!("busy_timeout: {e}"))?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;",
    )
    .map_err(|e| format!("pragmas_set: {e}"))?;
    verify_connection_pragmas(conn)
}

fn verify_connection_pragmas(conn: &Connection) -> Result<(), String> {
    let journal_mode: String = conn
        .query_row("PRAGMA journal_mode", [], |row| row.get(0))
        .map_err(|e| format!("pragma_journal_mode: {e}"))?;
    if !journal_mode.eq_ignore_ascii_case("wal") {
        return Err(format!("pragma_journal_mode_unexpected: {journal_mode}"));
    }

    let synchronous: i64 = conn
        .query_row("PRAGMA synchronous", [], |row| row.get(0))
        .map_err(|e| format!("pragma_synchronous: {e}"))?;
    // SQLite values: OFF=0, NORMAL=1, FULL=2, EXTRA=3
    if synchronous != 1 {
        return Err(format!("pragma_synchronous_unexpected: {synchronous}"));
    }

    let foreign_keys: i64 = conn
        .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
        .map_err(|e| format!("pragma_foreign_keys: {e}"))?;
    if foreign_keys != 1 {
        return Err(format!("pragma_foreign_keys_unexpected: {foreign_keys}"));
    }

    let busy_timeout: i64 = conn
        .query_row("PRAGMA busy_timeout", [], |row| row.get(0))
        .map_err(|e| format!("pragma_busy_timeout: {e}"))?;
    if busy_timeout < SQLITE_BUSY_TIMEOUT_MS as i64 {
        return Err(format!("pragma_busy_timeout_unexpected: {busy_timeout}"));
    }

    Ok(())
}

fn ensure_talk_numbers(conn: &mut Connection) -> Result<(), String> {
    // `is_training` was introduced after the initial profile schema.
    // Ensure the flag exists before using it in talk numbering queries.
    ensure_talk_training_flag(conn)?;

    let has_column = db_helpers::column_exists(conn, "talk_projects", "talk_number")?;
    if !has_column {
        conn.execute(
            "ALTER TABLE talk_projects ADD COLUMN talk_number INTEGER",
            [],
        )
        .map_err(|e| format!("talk_number_add: {e}"))?;
    }

    let max_existing: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(talk_number), 0)
             FROM talk_projects
             WHERE talk_number > 0 AND COALESCE(is_training, 0) = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("talk_number_max: {e}"))?;

    conn.execute(
        "UPDATE talk_projects SET talk_number = NULL WHERE COALESCE(is_training, 0) = 1",
        [],
    )
    .map_err(|e| format!("talk_number_training_clear: {e}"))?;

    let mut next_number = max_existing + 1;
    let mut stmt = conn
        .prepare(
            "SELECT id FROM talk_projects
             WHERE (talk_number IS NULL OR talk_number <= 0)
               AND COALESCE(is_training, 0) = 0
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

fn ensure_talk_training_flag(conn: &mut Connection) -> Result<(), String> {
    let has_column = db_helpers::column_exists(conn, "talk_projects", "is_training")?;
    if !has_column {
        conn.execute(
            "ALTER TABLE talk_projects ADD COLUMN is_training INTEGER NOT NULL DEFAULT 0",
            [],
        )
        .map_err(|e| format!("is_training_add: {e}"))?;
    }

    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_talk_projects_one_training
         ON talk_projects(is_training)
         WHERE is_training = 1",
        [],
    )
    .map_err(|e| format!("is_training_index: {e}"))?;

    Ok(())
}

pub fn ensure_runs_nullable(conn: &mut Connection) -> Result<(), String> {
    let notnull = db_helpers::column_notnull(conn, "runs", "audio_artifact_id")?;
    if !notnull.unwrap_or(false) {
        return Ok(());
    }

    let rebuild_sql = "BEGIN;
         CREATE TABLE IF NOT EXISTS runs_new (
           id TEXT PRIMARY KEY,
           project_id TEXT NOT NULL,
           created_at TEXT NOT NULL,
           audio_artifact_id TEXT,
           transcript_id TEXT,
           feedback_id TEXT
         );
         INSERT INTO runs_new (id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id)
         SELECT id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id FROM runs;
         DROP TABLE runs;
         ALTER TABLE runs_new RENAME TO runs;
         CREATE INDEX IF NOT EXISTS idx_runs_project_time ON runs(project_id, created_at);
         COMMIT;";
    for attempt in 0..3 {
        match conn.execute_batch(rebuild_sql) {
            Ok(()) => return Ok(()),
            Err(err) => {
                let locked = matches!(
                    err,
                    rusqlite::Error::SqliteFailure(ref e, _)
                        if matches!(e.code, ErrorCode::DatabaseBusy | ErrorCode::DatabaseLocked)
                );
                if locked && attempt < 2 {
                    thread::sleep(Duration::from_millis(200));
                    continue;
                }
                if locked {
                    return Ok(());
                }
                return Err(format!("runs_rebuild: {err}"));
            }
        }
    }

    Ok(())
}

fn ensure_outline_table(conn: &mut Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS talk_outlines (
           project_id TEXT PRIMARY KEY,
           outline_md TEXT NOT NULL,
           created_at TEXT NOT NULL,
           updated_at TEXT NOT NULL
         )",
        [],
    )
    .map_err(|e| format!("outline_table: {e}"))?;
    Ok(())
}

fn ensure_profile_settings_table(conn: &mut Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS profile_settings (
           key TEXT PRIMARY KEY,
           value_json TEXT NOT NULL
         )",
        [],
    )
    .map_err(|e| format!("profile_settings_table: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::{params, Connection};
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn runs_audio_column_becomes_nullable() {
        let mut conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "CREATE TABLE runs (
               id TEXT PRIMARY KEY,
               project_id TEXT NOT NULL,
               created_at TEXT NOT NULL,
               audio_artifact_id TEXT NOT NULL,
               transcript_id TEXT,
               feedback_id TEXT
             );",
        )
        .expect("create");

        ensure_runs_nullable(&mut conn).expect("ensure");
        let notnull = crate::core::db_helpers::column_notnull(&conn, "runs", "audio_artifact_id")
            .expect("pragma");
        assert_eq!(notnull, Some(false));
    }

    #[test]
    fn talk_numbers_backfilled_in_order() {
        let mut conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "CREATE TABLE talk_projects (
               id TEXT PRIMARY KEY,
               title TEXT NOT NULL,
               audience TEXT,
               goal TEXT,
               duration_target_sec INTEGER,
               stage TEXT NOT NULL,
               created_at TEXT NOT NULL,
               updated_at TEXT NOT NULL
             );",
        )
        .expect("create");

        conn.execute(
            "INSERT INTO talk_projects (id, title, stage, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "proj_1",
                "First",
                "draft",
                "2024-01-01T00:00:00Z",
                "2024-01-01T00:00:00Z"
            ],
        )
        .expect("insert1");
        conn.execute(
            "INSERT INTO talk_projects (id, title, stage, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "proj_2",
                "Second",
                "draft",
                "2024-02-01T00:00:00Z",
                "2024-02-01T00:00:00Z"
            ],
        )
        .expect("insert2");

        ensure_talk_numbers(&mut conn).expect("ensure");
        let mut stmt = conn
            .prepare("SELECT talk_number FROM talk_projects ORDER BY created_at ASC")
            .expect("select");
        let numbers = stmt
            .query_map([], |row| row.get::<_, i64>(0))
            .expect("query")
            .map(|row| row.expect("row"))
            .collect::<Vec<i64>>();
        assert_eq!(numbers, vec![1, 2]);
    }

    #[test]
    fn sqlite_pragmas_are_applied_and_verified() {
        let db_path = temp_db_path("pragma-check");
        let conn = Connection::open(&db_path).expect("open");
        configure_connection_pragmas(&conn).expect("configure");
        verify_connection_pragmas(&conn).expect("verify");
        drop(conn);
        let _ = std::fs::remove_file(&db_path);
        let _ = std::fs::remove_file(db_path.with_extension("db-wal"));
        let _ = std::fs::remove_file(db_path.with_extension("db-shm"));
    }

    #[test]
    fn profile_migrations_are_recorded_in_order() {
        let mut conn = Connection::open_in_memory().expect("open");
        apply_migrations(&mut conn, "profile", PROFILE_MIGRATIONS).expect("migrate");

        let applied = load_applied_migrations(&conn).expect("applied");
        assert_eq!(applied.len(), PROFILE_MIGRATIONS.len());
        assert_eq!(applied.first().map(String::as_str), Some("0001_init"));
        assert_eq!(applied.last().map(String::as_str), Some("0006_seed_quests"));
    }

    #[test]
    fn migration_continuity_rejects_gaps() {
        let conn = Connection::open_in_memory().expect("open");
        ensure_schema_migrations_table(&conn).expect("schema_migrations");
        conn.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
            params!["0001_init", "2026-02-28T00:00:00Z"],
        )
        .expect("insert 0001");
        conn.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
            params!["0003_talk_training_flag", "2026-02-28T00:00:01Z"],
        )
        .expect("insert 0003");

        let applied = load_applied_migrations(&conn).expect("applied");
        let err = validate_migration_continuity("profile", &applied, PROFILE_MIGRATIONS)
            .expect_err("gap should fail");
        assert!(err.contains("expected 0002_outline_and_settings"));
    }

    #[test]
    fn legacy_profile_schema_upgrades_with_data_preserved() {
        let mut conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "CREATE TABLE talk_projects (
               id TEXT PRIMARY KEY,
               title TEXT NOT NULL,
               audience TEXT,
               goal TEXT,
               duration_target_sec INTEGER,
               stage TEXT NOT NULL,
               created_at TEXT NOT NULL,
               updated_at TEXT NOT NULL
             );
             CREATE TABLE runs (
               id TEXT PRIMARY KEY,
               project_id TEXT NOT NULL,
               created_at TEXT NOT NULL,
               audio_artifact_id TEXT NOT NULL,
               transcript_id TEXT,
               feedback_id TEXT
             );",
        )
        .expect("legacy schema");
        conn.execute(
            "INSERT INTO talk_projects (id, title, stage, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "proj_legacy",
                "Legacy Talk",
                "draft",
                "2025-01-01T00:00:00Z",
                "2025-01-01T00:00:00Z"
            ],
        )
        .expect("insert legacy project");
        conn.execute(
            "INSERT INTO runs (id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                "run_legacy",
                "proj_legacy",
                "2025-01-01T00:01:00Z",
                "audio_legacy",
                Option::<String>::None,
                Option::<String>::None
            ],
        )
        .expect("insert legacy run");

        apply_migrations(&mut conn, "profile", PROFILE_MIGRATIONS).expect("migrate");

        let has_talk_number =
            crate::core::db_helpers::column_exists(&conn, "talk_projects", "talk_number")
                .expect("talk_number exists");
        assert!(has_talk_number);
        let has_training_flag =
            crate::core::db_helpers::column_exists(&conn, "talk_projects", "is_training")
                .expect("is_training exists");
        assert!(has_training_flag);
        let runs_audio_notnull =
            crate::core::db_helpers::column_notnull(&conn, "runs", "audio_artifact_id")
                .expect("runs audio nullable");
        assert_eq!(runs_audio_notnull, Some(false));

        let talk_number: Option<i64> = conn
            .query_row(
                "SELECT talk_number FROM talk_projects WHERE id = ?1",
                params!["proj_legacy"],
                |row| row.get(0),
            )
            .expect("talk number");
        assert_eq!(talk_number, Some(1));

        let preserved_audio: String = conn
            .query_row(
                "SELECT audio_artifact_id FROM runs WHERE id = ?1",
                params!["run_legacy"],
                |row| row.get(0),
            )
            .expect("run audio");
        assert_eq!(preserved_audio, "audio_legacy");

        let applied = load_applied_migrations(&conn).expect("applied");
        assert_eq!(applied.len(), PROFILE_MIGRATIONS.len());
    }

    #[test]
    fn profile_migration_continues_from_recorded_prefix() {
        let mut conn = Connection::open_in_memory().expect("open");
        migration_profile_0001_init(&mut conn).expect("0001");
        migration_profile_0002_outline_and_settings(&mut conn).expect("0002");
        ensure_schema_migrations_table(&conn).expect("schema_migrations");
        record_migration(&conn, "0001_init").expect("record 0001");
        record_migration(&conn, "0002_outline_and_settings").expect("record 0002");

        conn.execute(
            "INSERT INTO talk_projects (id, title, stage, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "proj_prefix",
                "Prefix Talk",
                "draft",
                "2025-02-01T00:00:00Z",
                "2025-02-01T00:00:00Z"
            ],
        )
        .expect("insert project");

        apply_migrations(&mut conn, "profile", PROFILE_MIGRATIONS).expect("migrate remaining");

        let has_training_flag =
            crate::core::db_helpers::column_exists(&conn, "talk_projects", "is_training")
                .expect("is_training exists");
        assert!(has_training_flag);
        let applied = load_applied_migrations(&conn).expect("applied");
        assert_eq!(applied.len(), PROFILE_MIGRATIONS.len());
        assert_eq!(applied[0], "0001_init");
        assert_eq!(applied[1], "0002_outline_and_settings");
        assert_eq!(applied.last().map(String::as_str), Some("0006_seed_quests"));
    }

    fn temp_db_path(prefix: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("now")
            .as_nanos();
        std::env::temp_dir().join(format!("lepupitre-{prefix}-{nanos}.db"))
    }
}
