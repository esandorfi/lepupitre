use crate::kernel::models::ProfileSummary;
use rusqlite::Connection;

pub fn select_profiles(conn: &Connection) -> Result<Vec<ProfileSummary>, String> {
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
        profiles.push(row.map_err(|e| format!("row: {e}"))?);
    }

    Ok(profiles)
}

pub fn talk_count(conn: &Connection) -> u64 {
    conn.query_row(
        "SELECT COUNT(*) FROM talk_projects WHERE COALESCE(is_training, 0) = 0",
        [],
        |row| row.get::<_, u64>(0),
    )
    .unwrap_or(0)
}
