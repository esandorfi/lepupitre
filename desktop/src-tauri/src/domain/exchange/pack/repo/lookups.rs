use super::queries;
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
            queries::SELECT_ARTIFACT_BY_ID,
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
            queries::SELECT_OUTLINE_MARKDOWN,
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
        .query_row(queries::SELECT_NEXT_TALK_NUMBER, [], |row| row.get(0))
        .map_err(|e| format!("talk_number_max: {e}"))?;
    Ok(max_value + 1)
}

pub(in crate::domain::exchange::pack) fn run_export_refs(
    conn: &rusqlite::Connection,
    run_id: &str,
) -> Result<(String, String, String), String> {
    let (project_id, audio_id, transcript_id): (String, Option<String>, Option<String>) = conn
        .query_row(queries::SELECT_RUN_EXPORT_REFS, params![run_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|e| format!("run_lookup: {e}"))?;
    let audio_id = audio_id.ok_or_else(|| "run_missing_audio".to_string())?;
    let transcript_id = transcript_id.ok_or_else(|| "run_missing_transcript".to_string())?;
    Ok((project_id, audio_id, transcript_id))
}

pub(in crate::domain::exchange::pack) fn project_title(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<String, String> {
    conn.query_row(
        queries::SELECT_PROJECT_TITLE_BY_ID,
        params![project_id],
        |row| row.get(0),
    )
    .map_err(|e| format!("project_lookup: {e}"))
}

fn default_outline(title: &str) -> String {
    format!(
        "# {title}\n\n## Opening\n- Hook\n- Promise\n\n## Key points\n- Point 1\n- Point 2\n- Point 3\n\n## Closing\n- Summary\n- Call to action\n"
    )
}
