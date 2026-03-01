use super::queries;
use rusqlite::{params, OptionalExtension};

pub(super) fn project_title(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<String, String> {
    conn.query_row(queries::SELECT_PROJECT_TITLE, params![project_id], |row| {
        row.get(0)
    })
    .map_err(|e| format!("project_lookup: {e}"))
}

pub(super) fn stored_outline(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<Option<(String, String)>, String> {
    conn.query_row(queries::SELECT_STORED_OUTLINE, params![project_id], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })
    .optional()
    .map_err(|e| format!("outline_lookup: {e}"))
}

pub(super) fn project_exists(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<bool, String> {
    let exists: i64 = conn
        .query_row(queries::SELECT_PROJECT_EXISTS, params![project_id], |row| {
            row.get(0)
        })
        .map_err(|e| format!("project_check: {e}"))?;
    Ok(exists > 0)
}

pub(super) fn upsert_outline(
    conn: &rusqlite::Connection,
    project_id: &str,
    markdown: &str,
    now: &str,
) -> Result<(), String> {
    conn.execute(
        queries::UPSERT_OUTLINE,
        params![project_id, markdown, now, now],
    )
    .map_err(|e| format!("outline_upsert: {e}"))?;
    Ok(())
}

pub(super) fn outline_markdown(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<Option<String>, String> {
    conn.query_row(
        queries::SELECT_OUTLINE_MARKDOWN,
        params![project_id],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| format!("outline_lookup: {e}"))
}
