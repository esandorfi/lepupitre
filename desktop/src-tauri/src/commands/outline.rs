use crate::core::{db, models, time};
use rusqlite::{params, OptionalExtension};

#[tauri::command]
pub fn outline_get(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<models::OutlineDoc, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let project_title: String = conn
        .query_row(
            "SELECT title FROM talk_projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("project_lookup: {e}"))?;

    let stored: Option<(String, String)> = conn
        .query_row(
            "SELECT outline_md, updated_at FROM talk_outlines WHERE project_id = ?1",
            params![project_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|e| format!("outline_lookup: {e}"))?;

    if let Some((markdown, updated_at)) = stored {
        return Ok(models::OutlineDoc {
            project_id,
            markdown,
            updated_at: Some(updated_at),
        });
    }

    Ok(models::OutlineDoc {
        project_id,
        markdown: default_outline(&project_title),
        updated_at: None,
    })
}

#[tauri::command]
pub fn outline_set(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    markdown: String,
) -> Result<(), String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM talk_projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("project_check: {e}"))?;
    if exists == 0 {
        return Err("project_not_found".to_string());
    }

    let now = time::now_rfc3339();
    conn.execute(
        "INSERT INTO talk_outlines (project_id, outline_md, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(project_id) DO UPDATE SET outline_md = excluded.outline_md, updated_at = excluded.updated_at",
        params![project_id, markdown, now, now],
    )
    .map_err(|e| format!("outline_upsert: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn export_outline(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<models::ExportResult, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let project_title: String = conn
        .query_row(
            "SELECT title FROM talk_projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("project_lookup: {e}"))?;

    let outline: Option<String> = conn
        .query_row(
            "SELECT outline_md FROM talk_outlines WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("outline_lookup: {e}"))?;

    let content = outline.unwrap_or_else(|| default_outline(&project_title));
    let profile_dir = db::profile_dir(&app, &profile_id)?;
    let export_dir = profile_dir.join("exports").join("outline");
    std::fs::create_dir_all(&export_dir).map_err(|e| format!("export_dir: {e}"))?;

    let filename = format!("{project_id}.md");
    let export_path = export_dir.join(filename);
    std::fs::write(&export_path, content).map_err(|e| format!("export_write: {e}"))?;

    Ok(models::ExportResult {
        path: export_path.to_string_lossy().to_string(),
    })
}

fn default_outline(title: &str) -> String {
    format!(
        "# {title}\n\n## Opening\n- Hook\n- Promise\n\n## Key points\n- Point 1\n- Point 2\n- Point 3\n\n## Closing\n- Summary\n- Call to action\n"
    )
}
