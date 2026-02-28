use rusqlite::{params, Connection};
use std::path::PathBuf;

fn make_temp_dir(name: &str) -> PathBuf {
    let mut path = std::env::temp_dir();
    path.push(format!("lepupitre-{name}-{}", std::process::id()));
    std::fs::create_dir_all(&path).expect("create temp dir");
    path
}

#[test]
fn profile_preference_storage_isolated_per_profile_db() {
    let root = make_temp_dir("profile-prefs");
    let profile_a_path = root.join("profile-a.db");
    let profile_b_path = root.join("profile-b.db");

    let conn_a = Connection::open(&profile_a_path).expect("open a");
    conn_a
        .execute(
            "CREATE TABLE IF NOT EXISTS profile_settings (
               key TEXT PRIMARY KEY,
               value_json TEXT NOT NULL
             )",
            [],
        )
        .expect("create a table");
    conn_a
        .execute(
            "INSERT INTO profile_settings (key, value_json) VALUES (?1, ?2)",
            params!["lepupitre.training.heroQuest", "Q-ALPHA"],
        )
        .expect("insert a");

    let conn_b = Connection::open(&profile_b_path).expect("open b");
    conn_b
        .execute(
            "CREATE TABLE IF NOT EXISTS profile_settings (
               key TEXT PRIMARY KEY,
               value_json TEXT NOT NULL
             )",
            [],
        )
        .expect("create b table");
    conn_b
        .execute(
            "INSERT INTO profile_settings (key, value_json) VALUES (?1, ?2)",
            params!["lepupitre.training.heroQuest", "Q-BETA"],
        )
        .expect("insert b");

    let value_a: String = conn_a
        .query_row(
            "SELECT value_json FROM profile_settings WHERE key = ?1",
            params!["lepupitre.training.heroQuest"],
            |row| row.get(0),
        )
        .expect("query a");
    let value_b: String = conn_b
        .query_row(
            "SELECT value_json FROM profile_settings WHERE key = ?1",
            params!["lepupitre.training.heroQuest"],
            |row| row.get(0),
        )
        .expect("query b");

    assert_eq!(value_a, "Q-ALPHA");
    assert_eq!(value_b, "Q-BETA");

    drop(conn_a);
    drop(conn_b);
    std::fs::remove_dir_all(root).expect("cleanup");
}
