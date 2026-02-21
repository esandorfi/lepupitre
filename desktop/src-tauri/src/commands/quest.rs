use crate::core::{db, ids, models::Quest, models::QuestDaily, time};
use rusqlite::params;

#[tauri::command]
pub fn quest_get_daily(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<QuestDaily, String> {
    let conn = db::open_profile(&app, &profile_id)?;

    let mut stmt = conn
        .prepare(
            "SELECT code, title, category, estimated_sec, prompt, output_type, targets_issues_json
             FROM quests
             ORDER BY code ASC
             LIMIT 1",
        )
        .map_err(|e| format!("prepare: {e}"))?;

    let mut rows = stmt.query([]).map_err(|e| format!("query: {e}"))?;
    let row = rows
        .next()
        .map_err(|e| format!("row: {e}"))?
        .ok_or_else(|| "no_quest_seeded".to_string())?;

    let targets_json: String = row.get(6).map_err(|e| format!("targets: {e}"))?;
    let targets: Vec<String> =
        serde_json::from_str(&targets_json).map_err(|e| format!("targets_parse: {e}"))?;

    let quest = Quest {
        code: row.get(0).map_err(|e| format!("code: {e}"))?,
        title: row.get(1).map_err(|e| format!("title: {e}"))?,
        category: row.get(2).map_err(|e| format!("category: {e}"))?,
        estimated_sec: row.get(3).map_err(|e| format!("estimated: {e}"))?,
        prompt: row.get(4).map_err(|e| format!("prompt: {e}"))?,
        output_type: row.get(5).map_err(|e| format!("output_type: {e}"))?,
        targets_issues: targets,
    };

    let why = format!("Project {} is in draft", project_id);

    Ok(QuestDaily {
        quest,
        why,
        due_boss_run: false,
    })
}

#[tauri::command]
pub fn quest_submit_text(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    quest_code: String,
    text: String,
) -> Result<String, String> {
    let conn = db::open_profile(&app, &profile_id)?;
    let id = ids::new_id("att");
    let now = time::now_rfc3339();

    conn.execute(
        "INSERT INTO quest_attempts (id, project_id, quest_code, created_at, output_text)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, project_id, quest_code, now, text],
    )
    .map_err(|e| format!("insert: {e}"))?;

    Ok(id)
}
