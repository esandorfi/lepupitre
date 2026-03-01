use rusqlite::{params, OptionalExtension};

#[derive(Debug)]
pub(in crate::domain::exchange::pack) struct ArtifactRow {
    pub(in crate::domain::exchange::pack) relpath: String,
    pub(in crate::domain::exchange::pack) sha256: String,
    pub(in crate::domain::exchange::pack) bytes: u64,
}

pub(in crate::domain::exchange::pack) fn load_artifact(
    conn: &rusqlite::Connection,
    artifact_id: &str,
    expected_type: &str,
) -> Result<ArtifactRow, String> {
    let row = conn
        .query_row(
            "SELECT local_relpath, sha256, bytes, type FROM artifacts WHERE id = ?1",
            params![artifact_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, String>(3)?,
                ))
            },
        )
        .map_err(|e| format!("artifact_lookup: {e}"))?;
    if row.3 != expected_type {
        return Err("artifact_type_mismatch".to_string());
    }
    Ok(ArtifactRow {
        relpath: row.0,
        sha256: row.1,
        bytes: row.2 as u64,
    })
}

pub(in crate::domain::exchange::pack) fn outline_markdown(
    conn: &rusqlite::Connection,
    project_id: &str,
    project_title: &str,
) -> Result<String, String> {
    let stored: Option<String> = conn
        .query_row(
            "SELECT outline_md FROM talk_outlines WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("outline_lookup: {e}"))?;
    Ok(stored.unwrap_or_else(|| default_outline(project_title)))
}

pub(in crate::domain::exchange::pack) fn next_talk_number(
    conn: &rusqlite::Connection,
) -> Result<i64, String> {
    let max_value: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(talk_number), 0) FROM talk_projects",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("talk_number_max: {e}"))?;
    Ok(max_value + 1)
}

fn default_outline(title: &str) -> String {
    format!(
        "# {title}\n\n## Opening\n- Hook\n- Promise\n\n## Key points\n- Point 1\n- Point 2\n- Point 3\n\n## Closing\n- Summary\n- Call to action\n"
    )
}
