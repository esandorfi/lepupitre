use crate::core::{models::Quest, models::QuestDaily, quest as quest_core};

pub use quest_core::{QuestAttemptSummary, QuestReportItem};

#[tauri::command]
pub fn quest_get_daily(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<QuestDaily, String> {
    quest_core::quest_get_daily(&app, &profile_id, &project_id)
}

#[tauri::command]
pub fn quest_get_by_code(
    app: tauri::AppHandle,
    profile_id: String,
    quest_code: String,
) -> Result<Quest, String> {
    quest_core::quest_get_by_code(&app, &profile_id, &quest_code)
}

#[tauri::command]
pub fn quest_list(app: tauri::AppHandle, profile_id: String) -> Result<Vec<Quest>, String> {
    quest_core::quest_list(&app, &profile_id)
}

#[tauri::command]
pub fn quest_attempts_list(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    limit: Option<u32>,
) -> Result<Vec<QuestAttemptSummary>, String> {
    quest_core::quest_attempts_list(&app, &profile_id, &project_id, limit)
}

#[tauri::command]
pub fn quest_report(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<Vec<QuestReportItem>, String> {
    quest_core::quest_report(&app, &profile_id, &project_id)
}

#[tauri::command]
pub fn quest_submit_text(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    quest_code: String,
    text: String,
) -> Result<String, String> {
    quest_core::quest_submit_text(&app, &profile_id, &project_id, &quest_code, &text)
}

#[tauri::command]
pub fn quest_submit_audio(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    quest_code: String,
    audio_artifact_id: String,
    transcript_id: Option<String>,
) -> Result<String, String> {
    quest_core::quest_submit_audio(
        &app,
        &profile_id,
        &project_id,
        &quest_code,
        &audio_artifact_id,
        transcript_id,
    )
}
