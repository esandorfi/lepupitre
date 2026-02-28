use crate::core::db_helpers;
use crate::core::seed::QuestSeedFile;
use crate::core::time;
use chrono::Utc;
use rusqlite::{params, Connection, ErrorCode};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::Duration;
use tauri::Manager;

const SQLITE_BUSY_TIMEOUT_MS: u64 = 2000;
const DB_SNAPSHOT_RETENTION_COUNT: usize = 5;
const GLOBAL_MIGRATION: &str = include_str!("../../../../migrations/global/0001_init.sql");
const PROFILE_MIGRATION: &str = include_str!("../../../../migrations/profile/0001_init.sql");
const QUESTS_SEED: &str = include_str!("../../../../seed/quests.v1.json");
const PROFILE_FK_MIGRATION_SQL: &str = "
PRAGMA foreign_keys = OFF;
BEGIN;

UPDATE active_state
SET active_project_id = NULL
WHERE active_project_id IS NOT NULL
  AND active_project_id NOT IN (SELECT id FROM talk_projects);

DELETE FROM talk_outlines
WHERE project_id NOT IN (SELECT id FROM talk_projects);

DELETE FROM auto_feedback
WHERE feedback_json_artifact_id NOT IN (SELECT id FROM artifacts);

UPDATE quest_attempts
SET feedback_id = NULL
WHERE feedback_id IS NOT NULL
  AND feedback_id NOT IN (SELECT id FROM auto_feedback);

UPDATE runs
SET feedback_id = NULL
WHERE feedback_id IS NOT NULL
  AND feedback_id NOT IN (SELECT id FROM auto_feedback);

UPDATE quest_attempts
SET audio_artifact_id = NULL
WHERE audio_artifact_id IS NOT NULL
  AND audio_artifact_id NOT IN (SELECT id FROM artifacts);

UPDATE quest_attempts
SET transcript_id = NULL
WHERE transcript_id IS NOT NULL
  AND transcript_id NOT IN (SELECT id FROM artifacts);

UPDATE runs
SET audio_artifact_id = NULL
WHERE audio_artifact_id IS NOT NULL
  AND audio_artifact_id NOT IN (SELECT id FROM artifacts);

UPDATE runs
SET transcript_id = NULL
WHERE transcript_id IS NOT NULL
  AND transcript_id NOT IN (SELECT id FROM artifacts);

DELETE FROM feedback_notes
WHERE feedback_id NOT IN (SELECT id FROM auto_feedback);

DELETE FROM quest_attempts
WHERE project_id NOT IN (SELECT id FROM talk_projects)
   OR quest_code NOT IN (SELECT code FROM quests);

DELETE FROM runs
WHERE project_id NOT IN (SELECT id FROM talk_projects);

DELETE FROM peer_reviews
WHERE run_id NOT IN (SELECT id FROM runs)
   OR review_json_artifact_id NOT IN (SELECT id FROM artifacts);

CREATE TABLE IF NOT EXISTS talk_projects_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audience TEXT,
  goal TEXT,
  duration_target_sec INTEGER,
  talk_number INTEGER,
  stage TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_training INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS auto_feedback_new (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  feedback_json_artifact_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  FOREIGN KEY(feedback_json_artifact_id) REFERENCES artifacts(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS quest_attempts_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  quest_code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  output_text TEXT,
  audio_artifact_id TEXT,
  transcript_id TEXT,
  feedback_id TEXT,
  FOREIGN KEY(project_id) REFERENCES talk_projects_new(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY(quest_code) REFERENCES quests(code) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY(audio_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY(transcript_id) REFERENCES artifacts(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY(feedback_id) REFERENCES auto_feedback_new(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS runs_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  audio_artifact_id TEXT,
  transcript_id TEXT,
  feedback_id TEXT,
  FOREIGN KEY(project_id) REFERENCES talk_projects_new(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY(audio_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY(transcript_id) REFERENCES artifacts(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY(feedback_id) REFERENCES auto_feedback_new(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback_notes_new (
  feedback_id TEXT PRIMARY KEY,
  note_text TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(feedback_id) REFERENCES auto_feedback_new(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS peer_reviews_new (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reviewer_tag TEXT,
  review_json_artifact_id TEXT NOT NULL,
  FOREIGN KEY(run_id) REFERENCES runs_new(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY(review_json_artifact_id) REFERENCES artifacts(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS active_state_new (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_project_id TEXT,
  FOREIGN KEY(active_project_id) REFERENCES talk_projects_new(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS talk_outlines_new (
  project_id TEXT PRIMARY KEY,
  outline_md TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES talk_projects_new(id) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO talk_projects_new (id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at, is_training)
SELECT id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at, COALESCE(is_training, 0)
FROM talk_projects;

INSERT INTO auto_feedback_new (id, subject_type, subject_id, created_at, feedback_json_artifact_id, overall_score)
SELECT id, subject_type, subject_id, created_at, feedback_json_artifact_id, overall_score
FROM auto_feedback;

INSERT INTO quest_attempts_new (id, project_id, quest_code, created_at, output_text, audio_artifact_id, transcript_id, feedback_id)
SELECT id, project_id, quest_code, created_at, output_text, audio_artifact_id, transcript_id, feedback_id
FROM quest_attempts;

INSERT INTO runs_new (id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id)
SELECT id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id
FROM runs;

INSERT INTO feedback_notes_new (feedback_id, note_text, updated_at)
SELECT feedback_id, note_text, updated_at
FROM feedback_notes;

INSERT INTO peer_reviews_new (id, run_id, created_at, reviewer_tag, review_json_artifact_id)
SELECT id, run_id, created_at, reviewer_tag, review_json_artifact_id
FROM peer_reviews;

INSERT INTO active_state_new (id, active_project_id)
SELECT id, active_project_id
FROM active_state;

INSERT INTO talk_outlines_new (project_id, outline_md, created_at, updated_at)
SELECT project_id, outline_md, created_at, updated_at
FROM talk_outlines;

DROP TABLE quest_attempts;
DROP TABLE runs;
DROP TABLE feedback_notes;
DROP TABLE peer_reviews;
DROP TABLE active_state;
DROP TABLE talk_outlines;
DROP TABLE auto_feedback;
DROP TABLE talk_projects;

ALTER TABLE talk_projects_new RENAME TO talk_projects;
ALTER TABLE auto_feedback_new RENAME TO auto_feedback;
ALTER TABLE quest_attempts_new RENAME TO quest_attempts;
ALTER TABLE runs_new RENAME TO runs;
ALTER TABLE feedback_notes_new RENAME TO feedback_notes;
ALTER TABLE peer_reviews_new RENAME TO peer_reviews;
ALTER TABLE active_state_new RENAME TO active_state;
ALTER TABLE talk_outlines_new RENAME TO talk_outlines;

CREATE UNIQUE INDEX IF NOT EXISTS idx_talk_projects_one_training
  ON talk_projects(is_training)
  WHERE is_training = 1;
CREATE INDEX IF NOT EXISTS idx_attempts_project_time ON quest_attempts(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_runs_project_time ON runs(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_sha ON artifacts(sha256);

COMMIT;
PRAGMA foreign_keys = ON;
";

static GLOBAL_MIGRATION_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
static PROFILE_MIGRATION_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

type MigrationFn = fn(&mut Connection) -> Result<(), String>;

struct Migration {
    version: &'static str,
    apply: MigrationFn,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbDiagnostics {
    pub scope: String,
    pub schema_version: Option<String>,
    pub latest_migration: Option<String>,
    pub applied_migration_count: usize,
    pub expected_migration_count: usize,
    pub continuity_ok: bool,
    pub continuity_error: Option<String>,
    pub integrity_check: String,
    pub foreign_key_violations: usize,
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
    Migration {
        version: "0007_fk_constraints",
        apply: migration_profile_0007_fk_constraints,
    },
];

pub fn open_global(app: &tauri::AppHandle) -> Result<Connection, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| format!("create_dir: {e}"))?;

    let db_path = app_data_dir.join("global.db");
    let mut conn = open_connection_with_recovery(&db_path, "global")?;

    let lock = GLOBAL_MIGRATION_LOCK.get_or_init(|| Mutex::new(()));
    let _guard = lock
        .lock()
        .map_err(|_| "global_migration_lock".to_string())?;
    apply_migrations(&mut conn, &db_path, "global", GLOBAL_MIGRATIONS)?;
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
    let mut conn = open_connection_with_recovery(&db_path, "profile")?;

    let lock = PROFILE_MIGRATION_LOCK.get_or_init(|| Mutex::new(()));
    let _guard = lock
        .lock()
        .map_err(|_| "profile_migration_lock".to_string())?;
    apply_migrations(&mut conn, &db_path, "profile", PROFILE_MIGRATIONS)?;

    Ok(conn)
}

pub fn profile_dir(app: &tauri::AppHandle, profile_id: &str) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    Ok(app_data_dir.join("profiles").join(profile_id))
}

fn open_connection_with_recovery(db_path: &Path, scope: &str) -> Result<Connection, String> {
    let mut conn = match Connection::open(db_path) {
        Ok(conn) => conn,
        Err(err) => {
            if !is_recoverable_open_error(&err) {
                return Err(format!("open: {err}"));
            }
            recover_corrupt_database(db_path, scope, &format!("open: {err}"))?;
            Connection::open(db_path).map_err(|e| format!("open_after_recovery: {e}"))?
        }
    };

    if let Err(err) = prepare_connection_for_open(&conn) {
        if !is_recoverable_runtime_error(&err) {
            return Err(err);
        }
        drop(conn);
        recover_corrupt_database(db_path, scope, &err)?;
        conn = Connection::open(db_path).map_err(|e| format!("open_after_recovery: {e}"))?;
        prepare_connection_for_open(&conn).map_err(|e| format!("post_recovery_prepare: {e}"))?;
    }

    Ok(conn)
}

fn prepare_connection_for_open(conn: &Connection) -> Result<(), String> {
    configure_connection_pragmas(conn)?;
    verify_database_integrity_for_open(conn)
}

fn verify_database_integrity_for_open(conn: &Connection) -> Result<(), String> {
    let quick_check: String = conn
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|e| format!("quick_check: {e}"))?;
    if !quick_check.eq_ignore_ascii_case("ok") {
        return Err(format!("database_integrity_failed: {quick_check}"));
    }
    Ok(())
}

fn is_recoverable_open_error(err: &rusqlite::Error) -> bool {
    let message = err.to_string().to_ascii_lowercase();
    message.contains("not a database")
        || message.contains("malformed")
        || message.contains("is encrypted")
}

fn is_recoverable_runtime_error(err: &str) -> bool {
    let message = err.to_ascii_lowercase();
    message.contains("database_integrity_failed")
        || message.contains("quick_check")
        || message.contains("not a database")
        || message.contains("malformed")
}

fn recover_corrupt_database(db_path: &Path, scope: &str, reason: &str) -> Result<(), String> {
    let parent = db_path
        .parent()
        .ok_or_else(|| "recovery_parent_missing".to_string())?;
    let db_stem = db_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("db");
    let timestamp = Utc::now().format("%Y%m%dT%H%M%SZ").to_string();

    let corrupted_dir = parent.join("corrupted");
    std::fs::create_dir_all(&corrupted_dir).map_err(|e| format!("recovery_corrupted_dir: {e}"))?;
    let quarantined_db = corrupted_dir.join(format!("{db_stem}-{scope}-corrupt-{timestamp}.db"));

    if db_path.exists() {
        std::fs::rename(db_path, &quarantined_db)
            .map_err(|e| format!("recovery_quarantine_db: {e}"))?;
    }

    move_if_exists(
        &db_path.with_extension("db-wal"),
        &corrupted_dir.join(format!("{db_stem}-{scope}-corrupt-{timestamp}.db-wal")),
    )?;
    move_if_exists(
        &db_path.with_extension("db-shm"),
        &corrupted_dir.join(format!("{db_stem}-{scope}-corrupt-{timestamp}.db-shm")),
    )?;

    let backups_dir = parent.join("backups");
    let latest_snapshot = find_latest_snapshot(&backups_dir, db_stem, scope)?;
    let Some(snapshot_path) = latest_snapshot else {
        return Err(format!(
            "db_recovery_no_snapshot: scope={scope}; reason={reason}; quarantined={}",
            quarantined_db.display()
        ));
    };

    std::fs::copy(&snapshot_path, db_path).map_err(|e| format!("recovery_restore_copy: {e}"))?;
    Ok(())
}

fn find_latest_snapshot(
    backups_dir: &Path,
    db_stem: &str,
    scope: &str,
) -> Result<Option<PathBuf>, String> {
    if !backups_dir.exists() {
        return Ok(None);
    }
    let prefix = format!("{db_stem}-{scope}-pre-");
    let mut candidates = Vec::new();
    let entries = std::fs::read_dir(backups_dir).map_err(|e| format!("snapshot_read_dir: {e}"))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("snapshot_entry: {e}"))?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if name.starts_with(&prefix) && name.ends_with(".db") {
            candidates.push(path);
        }
    }

    candidates.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
    Ok(candidates.into_iter().next())
}

fn move_if_exists(from: &Path, to: &Path) -> Result<(), String> {
    if !from.exists() {
        return Ok(());
    }
    std::fs::rename(from, to).map_err(|e| format!("recovery_quarantine_sidecar: {e}"))?;
    Ok(())
}

pub fn global_diagnostics(app: &tauri::AppHandle) -> Result<DbDiagnostics, String> {
    let conn = open_global(app)?;
    collect_diagnostics(&conn, "global", GLOBAL_MIGRATIONS)
}

pub fn profile_diagnostics(
    app: &tauri::AppHandle,
    profile_id: &str,
) -> Result<DbDiagnostics, String> {
    ensure_profile_exists(app, profile_id)?;
    let conn = open_profile(app, profile_id)?;
    collect_diagnostics(&conn, "profile", PROFILE_MIGRATIONS)
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

fn migration_profile_0007_fk_constraints(conn: &mut Connection) -> Result<(), String> {
    conn.execute_batch(PROFILE_FK_MIGRATION_SQL)
        .map_err(|e| format!("migrate_profile_0007: {e}"))?;
    verify_foreign_key_integrity(conn)
}

fn apply_migrations(
    conn: &mut Connection,
    db_path: &Path,
    scope: &str,
    migrations: &[Migration],
) -> Result<(), String> {
    ensure_schema_migrations_table(conn)?;
    let applied = load_applied_migrations(conn)?;
    validate_migration_continuity(scope, &applied, migrations)?;
    maybe_snapshot_before_migration(conn, db_path, scope, migrations, applied.len())?;

    for migration in migrations.iter().skip(applied.len()) {
        (migration.apply)(conn)?;
        record_migration(conn, migration.version)?;
    }

    Ok(())
}

fn maybe_snapshot_before_migration(
    conn: &Connection,
    db_path: &Path,
    scope: &str,
    migrations: &[Migration],
    applied_count: usize,
) -> Result<(), String> {
    if applied_count >= migrations.len() {
        return Ok(());
    }
    if !db_path.exists() {
        return Ok(());
    }
    let metadata = std::fs::metadata(db_path).map_err(|e| format!("snapshot_metadata: {e}"))?;
    if metadata.len() == 0 {
        return Ok(());
    }

    let next_migration = migrations
        .get(applied_count)
        .map(|migration| migration.version)
        .unwrap_or("unknown");
    create_db_snapshot(conn, db_path, scope, next_migration)?;
    Ok(())
}

fn create_db_snapshot(
    conn: &Connection,
    db_path: &Path,
    scope: &str,
    next_migration: &str,
) -> Result<PathBuf, String> {
    let parent = db_path
        .parent()
        .ok_or_else(|| "snapshot_parent_missing".to_string())?;
    let backups_dir = parent.join("backups");
    std::fs::create_dir_all(&backups_dir).map_err(|e| format!("snapshot_dir: {e}"))?;

    let db_stem = db_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("db");
    let timestamp = Utc::now().format("%Y%m%dT%H%M%SZ").to_string();
    let mut snapshot_path = backups_dir.join(format!(
        "{db_stem}-{scope}-pre-{next_migration}-{timestamp}.db"
    ));
    let mut sequence = 1_u32;
    while snapshot_path.exists() {
        snapshot_path = backups_dir.join(format!(
            "{db_stem}-{scope}-pre-{next_migration}-{timestamp}-{sequence}.db"
        ));
        sequence += 1;
    }

    let escaped_path = snapshot_path.to_string_lossy().replace('\'', "''");
    conn.execute_batch(&format!("VACUUM INTO '{escaped_path}';"))
        .map_err(|e| format!("snapshot_vacuum_into: {e}"))?;

    prune_old_snapshots(&backups_dir, db_stem, scope)?;
    Ok(snapshot_path)
}

fn prune_old_snapshots(backups_dir: &Path, db_stem: &str, scope: &str) -> Result<(), String> {
    let prefix = format!("{db_stem}-{scope}-pre-");
    let mut candidates = Vec::new();
    let entries = std::fs::read_dir(backups_dir).map_err(|e| format!("snapshot_read_dir: {e}"))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("snapshot_entry: {e}"))?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if name.starts_with(&prefix) && name.ends_with(".db") {
            candidates.push(path);
        }
    }

    if candidates.len() <= DB_SNAPSHOT_RETENTION_COUNT {
        return Ok(());
    }

    candidates.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
    for path in candidates.iter().skip(DB_SNAPSHOT_RETENTION_COUNT) {
        std::fs::remove_file(path).map_err(|e| format!("snapshot_prune_remove: {e}"))?;
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

fn verify_foreign_key_integrity(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare("PRAGMA foreign_key_check")
        .map_err(|e| format!("foreign_key_check_prepare: {e}"))?;
    let mut rows = stmt
        .query([])
        .map_err(|e| format!("foreign_key_check_query: {e}"))?;
    if let Some(row) = rows
        .next()
        .map_err(|e| format!("foreign_key_check_row: {e}"))?
    {
        let table: String = row
            .get(0)
            .map_err(|e| format!("foreign_key_check_table: {e}"))?;
        let rowid: i64 = row
            .get(1)
            .map_err(|e| format!("foreign_key_check_rowid: {e}"))?;
        let parent: String = row
            .get(2)
            .map_err(|e| format!("foreign_key_check_parent: {e}"))?;
        return Err(format!(
            "foreign_key_check_failed: {table}:{rowid}->{parent}"
        ));
    }
    Ok(())
}

fn collect_diagnostics(
    conn: &Connection,
    scope: &str,
    migrations: &[Migration],
) -> Result<DbDiagnostics, String> {
    ensure_schema_migrations_table(conn)?;
    let applied = load_applied_migrations(conn)?;
    let continuity_error = validate_migration_continuity(scope, &applied, migrations).err();
    let continuity_ok = continuity_error.is_none();
    let latest_migration = applied.last().cloned();
    let schema_version = latest_migration.clone();
    let integrity_check = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
        .map_err(|e| format!("integrity_check: {e}"))?;
    let foreign_key_violations = foreign_key_violation_count(conn)?;

    Ok(DbDiagnostics {
        scope: scope.to_string(),
        schema_version,
        latest_migration,
        applied_migration_count: applied.len(),
        expected_migration_count: migrations.len(),
        continuity_ok,
        continuity_error,
        integrity_check,
        foreign_key_violations,
    })
}

fn foreign_key_violation_count(conn: &Connection) -> Result<usize, String> {
    let mut stmt = conn
        .prepare("PRAGMA foreign_key_check")
        .map_err(|e| format!("foreign_key_check_prepare: {e}"))?;
    let mut rows = stmt
        .query([])
        .map_err(|e| format!("foreign_key_check_query: {e}"))?;
    let mut count = 0_usize;
    while rows
        .next()
        .map_err(|e| format!("foreign_key_check_row: {e}"))?
        .is_some()
    {
        count += 1;
    }
    Ok(count)
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
    use std::collections::BTreeSet;
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
        apply_migrations(
            &mut conn,
            Path::new(":memory:"),
            "profile",
            PROFILE_MIGRATIONS,
        )
        .expect("migrate");

        let applied = load_applied_migrations(&conn).expect("applied");
        assert_eq!(applied.len(), PROFILE_MIGRATIONS.len());
        assert_eq!(applied.first().map(String::as_str), Some("0001_init"));
        assert_eq!(
            applied.last().map(String::as_str),
            Some("0007_fk_constraints")
        );
    }

    #[test]
    fn global_migrations_are_recorded_in_order() {
        let mut conn = Connection::open_in_memory().expect("open");
        apply_migrations(
            &mut conn,
            Path::new(":memory:"),
            "global",
            GLOBAL_MIGRATIONS,
        )
        .expect("migrate");

        let applied = load_applied_migrations(&conn).expect("applied");
        assert_eq!(applied, vec!["0001_init".to_string()]);
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
    fn legacy_profile_schema_upgrades_and_normalizes_orphans() {
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

        apply_migrations(
            &mut conn,
            Path::new(":memory:"),
            "profile",
            PROFILE_MIGRATIONS,
        )
        .expect("migrate");

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

        let normalized_audio: Option<String> = conn
            .query_row(
                "SELECT audio_artifact_id FROM runs WHERE id = ?1",
                params!["run_legacy"],
                |row| row.get(0),
            )
            .expect("run audio");
        assert_eq!(normalized_audio, None);

        let applied = load_applied_migrations(&conn).expect("applied");
        assert_eq!(applied.len(), PROFILE_MIGRATIONS.len());
    }

    #[test]
    fn profile_fk_constraints_are_enforced_after_migration() {
        let mut conn = Connection::open_in_memory().expect("open");
        apply_migrations(
            &mut conn,
            Path::new(":memory:"),
            "profile",
            PROFILE_MIGRATIONS,
        )
        .expect("migrate");

        let insert_err = conn
            .execute(
                "INSERT INTO runs (id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    "run_missing_project",
                    "project_missing",
                    "2026-02-28T00:00:00Z",
                    Option::<String>::None,
                    Option::<String>::None,
                    Option::<String>::None
                ],
            )
            .expect_err("fk rejection");
        assert!(insert_err
            .to_string()
            .contains("FOREIGN KEY constraint failed"));
        verify_foreign_key_integrity(&conn).expect("fk integrity");
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

        apply_migrations(
            &mut conn,
            Path::new(":memory:"),
            "profile",
            PROFILE_MIGRATIONS,
        )
        .expect("migrate remaining");

        let has_training_flag =
            crate::core::db_helpers::column_exists(&conn, "talk_projects", "is_training")
                .expect("is_training exists");
        assert!(has_training_flag);
        let applied = load_applied_migrations(&conn).expect("applied");
        assert_eq!(applied.len(), PROFILE_MIGRATIONS.len());
        assert_eq!(applied[0], "0001_init");
        assert_eq!(applied[1], "0002_outline_and_settings");
        assert_eq!(
            applied.last().map(String::as_str),
            Some("0007_fk_constraints")
        );
    }

    #[test]
    fn pre_migration_snapshot_created_for_pending_profile_migrations() {
        let db_path = temp_db_path("snapshot");
        let mut conn = Connection::open(&db_path).expect("open");

        migration_profile_0001_init(&mut conn).expect("0001");
        ensure_schema_migrations_table(&conn).expect("schema");
        record_migration(&conn, "0001_init").expect("record");

        apply_migrations(&mut conn, &db_path, "profile", PROFILE_MIGRATIONS).expect("migrate");

        let backups_dir = db_path.parent().expect("parent").join("backups");
        let backup_count = std::fs::read_dir(&backups_dir)
            .expect("read backups")
            .flatten()
            .filter(|entry| entry.path().extension().and_then(|v| v.to_str()) == Some("db"))
            .count();
        assert!(backup_count >= 1);

        let _ = std::fs::remove_file(&db_path);
        let _ = std::fs::remove_file(db_path.with_extension("db-wal"));
        let _ = std::fs::remove_file(db_path.with_extension("db-shm"));
        let _ = std::fs::remove_dir_all(&backups_dir);
    }

    #[test]
    fn snapshot_retention_prunes_old_backups() {
        let root = std::env::temp_dir().join(format!(
            "lepupitre-snapshot-prune-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("now")
                .as_nanos()
        ));
        let backups_dir = root.join("backups");
        std::fs::create_dir_all(&backups_dir).expect("mkdir");

        for idx in 0..7 {
            let file = backups_dir.join(format!(
                "profile-profile-pre-0002-outline-20260228T00000{idx}Z.db"
            ));
            std::fs::write(&file, b"snapshot").expect("write");
        }

        prune_old_snapshots(&backups_dir, "profile", "profile").expect("prune");

        let remaining = std::fs::read_dir(&backups_dir)
            .expect("read")
            .flatten()
            .filter(|entry| entry.path().extension().and_then(|v| v.to_str()) == Some("db"))
            .count();
        assert_eq!(remaining, DB_SNAPSHOT_RETENTION_COUNT);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn diagnostics_reports_continuity_gap() {
        let conn = Connection::open_in_memory().expect("open");
        ensure_schema_migrations_table(&conn).expect("schema");
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

        let diagnostics = collect_diagnostics(&conn, "profile", PROFILE_MIGRATIONS).expect("diag");
        assert!(!diagnostics.continuity_ok);
        assert!(diagnostics
            .continuity_error
            .as_deref()
            .unwrap_or_default()
            .contains("expected 0002_outline_and_settings"));
        assert_eq!(diagnostics.integrity_check, "ok");
    }

    #[test]
    fn diagnostics_reports_clean_profile_db() {
        let mut conn = Connection::open_in_memory().expect("open");
        apply_migrations(
            &mut conn,
            Path::new(":memory:"),
            "profile",
            PROFILE_MIGRATIONS,
        )
        .expect("migrate");

        let diagnostics = collect_diagnostics(&conn, "profile", PROFILE_MIGRATIONS).expect("diag");
        assert!(diagnostics.continuity_ok);
        assert_eq!(
            diagnostics.applied_migration_count,
            PROFILE_MIGRATIONS.len()
        );
        assert_eq!(
            diagnostics.expected_migration_count,
            PROFILE_MIGRATIONS.len()
        );
        assert_eq!(diagnostics.integrity_check, "ok");
        assert_eq!(diagnostics.foreign_key_violations, 0);
    }

    #[test]
    fn diagnostics_payload_stays_metadata_only() {
        let diagnostics = DbDiagnostics {
            scope: "profile".to_string(),
            schema_version: Some("7".to_string()),
            latest_migration: Some("0007_fk_constraints".to_string()),
            applied_migration_count: 7,
            expected_migration_count: 7,
            continuity_ok: true,
            continuity_error: None,
            integrity_check: "ok".to_string(),
            foreign_key_violations: 0,
        };
        let payload = serde_json::to_value(diagnostics).expect("serialize diagnostics");
        let keys = payload
            .as_object()
            .expect("object")
            .keys()
            .cloned()
            .collect::<BTreeSet<String>>();
        let expected = [
            "scope",
            "schemaVersion",
            "latestMigration",
            "appliedMigrationCount",
            "expectedMigrationCount",
            "continuityOk",
            "continuityError",
            "integrityCheck",
            "foreignKeyViolations",
        ]
        .into_iter()
        .map(str::to_string)
        .collect::<BTreeSet<String>>();
        assert_eq!(keys, expected);

        let payload_text = payload.to_string().to_ascii_lowercase();
        assert!(!payload_text.contains("backup"));
        assert!(!payload_text.contains("corrupt"));
        assert!(!payload_text.contains("token"));
        assert!(!payload_text.contains("secret"));
        assert!(!payload_text.contains("password"));
    }

    #[test]
    fn required_profile_indexes_exist_after_migration() {
        let mut conn = Connection::open_in_memory().expect("open");
        apply_migrations(
            &mut conn,
            Path::new(":memory:"),
            "profile",
            PROFILE_MIGRATIONS,
        )
        .expect("migrate");

        assert!(index_exists(&conn, "idx_talk_projects_one_training"));
        assert!(index_exists(&conn, "idx_attempts_project_time"));
        assert!(index_exists(&conn, "idx_runs_project_time"));
        assert!(index_exists(&conn, "idx_artifacts_sha"));
    }

    #[test]
    fn run_hot_query_plan_uses_project_time_index() {
        let mut conn = Connection::open_in_memory().expect("open");
        apply_migrations(
            &mut conn,
            Path::new(":memory:"),
            "profile",
            PROFILE_MIGRATIONS,
        )
        .expect("migrate");

        conn.execute(
            "INSERT INTO talk_projects (id, title, stage, created_at, updated_at, is_training)
             VALUES (?1, ?2, ?3, ?4, ?5, 0)",
            params![
                "proj_plan",
                "Plan Talk",
                "draft",
                "2026-02-28T00:00:00Z",
                "2026-02-28T00:00:00Z"
            ],
        )
        .expect("insert project");
        conn.execute(
            "INSERT INTO runs (id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                "run_plan",
                "proj_plan",
                "2026-02-28T00:05:00Z",
                Option::<String>::None,
                Option::<String>::None,
                Option::<String>::None
            ],
        )
        .expect("insert run");

        let detail = explain_query_plan(
            &conn,
            "SELECT id FROM runs WHERE project_id = 'proj_plan' ORDER BY created_at DESC LIMIT 1",
        );
        assert!(
            detail.contains("idx_runs_project_time"),
            "query plan did not use idx_runs_project_time: {detail}"
        );
    }

    #[test]
    fn attempts_hot_query_plan_uses_project_time_index() {
        let mut conn = Connection::open_in_memory().expect("open");
        apply_migrations(
            &mut conn,
            Path::new(":memory:"),
            "profile",
            PROFILE_MIGRATIONS,
        )
        .expect("migrate");

        conn.execute(
            "INSERT INTO talk_projects (id, title, stage, created_at, updated_at, is_training)
             VALUES (?1, ?2, ?3, ?4, ?5, 0)",
            params![
                "proj_attempts_plan",
                "Plan Talk",
                "draft",
                "2026-02-28T00:00:00Z",
                "2026-02-28T00:00:00Z"
            ],
        )
        .expect("insert project");
        let quest_code: String = conn
            .query_row("SELECT code FROM quests LIMIT 1", [], |row| row.get(0))
            .expect("quest code");
        conn.execute(
            "INSERT INTO quest_attempts (id, project_id, quest_code, created_at, output_text, audio_artifact_id, transcript_id, feedback_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                "attempt_plan",
                "proj_attempts_plan",
                quest_code,
                "2026-02-28T00:06:00Z",
                Some("hello"),
                Option::<String>::None,
                Option::<String>::None,
                Option::<String>::None
            ],
        )
        .expect("insert attempt");

        let detail = explain_query_plan(
            &conn,
            "SELECT id FROM quest_attempts WHERE project_id = 'proj_attempts_plan' ORDER BY created_at DESC LIMIT 1",
        );
        assert!(
            detail.contains("idx_attempts_project_time"),
            "query plan did not use idx_attempts_project_time: {detail}"
        );
    }

    #[test]
    fn recovery_restores_latest_snapshot() {
        let root = std::env::temp_dir().join(format!(
            "lepupitre-recovery-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("now")
                .as_nanos()
        ));
        std::fs::create_dir_all(&root).expect("root");
        let db_path = root.join("global.db");
        std::fs::write(&db_path, b"not-a-sqlite-db").expect("corrupt");

        let backups_dir = root.join("backups");
        std::fs::create_dir_all(&backups_dir).expect("backups");
        let old_snapshot = backups_dir.join("global-global-pre-0002-test-20260228T010000Z.db");
        let new_snapshot = backups_dir.join("global-global-pre-0003-test-20260228T020000Z.db");
        create_snapshot_fixture(&old_snapshot, "old").expect("old snapshot");
        create_snapshot_fixture(&new_snapshot, "new").expect("new snapshot");

        recover_corrupt_database(&db_path, "global", "test").expect("recover");
        let restored_conn = Connection::open(&db_path).expect("open restored");
        let marker: String = restored_conn
            .query_row("SELECT marker FROM snapshot_marker LIMIT 1", [], |row| {
                row.get(0)
            })
            .expect("marker");
        assert_eq!(marker, "new");

        let corrupted_dir = root.join("corrupted");
        let quarantined_count = std::fs::read_dir(&corrupted_dir)
            .expect("corrupted entries")
            .flatten()
            .filter(|entry| entry.path().extension().and_then(|v| v.to_str()) == Some("db"))
            .count();
        assert!(quarantined_count >= 1);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn recovery_fails_without_snapshot() {
        let root = std::env::temp_dir().join(format!(
            "lepupitre-recovery-nosnapshot-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("now")
                .as_nanos()
        ));
        std::fs::create_dir_all(&root).expect("root");
        let db_path = root.join("profile.db");
        std::fs::write(&db_path, b"not-a-sqlite-db").expect("corrupt");

        let err = recover_corrupt_database(&db_path, "profile", "test").expect_err("no snapshot");
        assert!(err.contains("db_recovery_no_snapshot"));

        let _ = std::fs::remove_dir_all(&root);
    }

    fn temp_db_path(prefix: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("now")
            .as_nanos();
        std::env::temp_dir().join(format!("lepupitre-{prefix}-{nanos}.db"))
    }

    fn index_exists(conn: &Connection, name: &str) -> bool {
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = ?1",
                params![name],
                |row| row.get(0),
            )
            .expect("index exists query");
        count > 0
    }

    fn explain_query_plan(conn: &Connection, sql: &str) -> String {
        let statement = format!("EXPLAIN QUERY PLAN {sql}");
        let mut stmt = conn.prepare(&statement).expect("plan prepare");
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(3))
            .expect("plan query");
        let details: Vec<String> = rows.map(|row| row.expect("plan row")).collect();
        details.join(" | ").to_ascii_lowercase()
    }

    fn create_snapshot_fixture(path: &Path, marker: &str) -> Result<(), String> {
        let conn = Connection::open(path).map_err(|e| format!("snapshot_open: {e}"))?;
        conn.execute("CREATE TABLE snapshot_marker (marker TEXT NOT NULL)", [])
            .map_err(|e| format!("snapshot_create: {e}"))?;
        conn.execute("INSERT INTO snapshot_marker (marker) VALUES (?1)", [marker])
            .map_err(|e| format!("snapshot_insert: {e}"))?;
        Ok(())
    }
}
