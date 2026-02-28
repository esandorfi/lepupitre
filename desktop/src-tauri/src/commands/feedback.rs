use crate::core::{feedback as feedback_core, models};

pub use feedback_core::{AnalyzeResponse, FeedbackContext, FeedbackTimelineItem};

#[tauri::command]
pub fn feedback_timeline_list(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<FeedbackTimelineItem>, String> {
    feedback_core::feedback_timeline_list(&app, &profile_id, project_id, limit)
}

#[tauri::command]
pub fn analyze_attempt(
    app: tauri::AppHandle,
    profile_id: String,
    attempt_id: String,
) -> Result<AnalyzeResponse, String> {
    feedback_core::analyze_attempt(&app, &profile_id, &attempt_id)
}

#[tauri::command]
pub fn feedback_get(
    app: tauri::AppHandle,
    profile_id: String,
    feedback_id: String,
) -> Result<models::FeedbackV1, String> {
    feedback_core::feedback_get(&app, &profile_id, &feedback_id)
}

#[tauri::command]
pub fn feedback_context_get(
    app: tauri::AppHandle,
    profile_id: String,
    feedback_id: String,
) -> Result<FeedbackContext, String> {
    feedback_core::feedback_context_get(&app, &profile_id, &feedback_id)
}

#[tauri::command]
pub fn feedback_note_get(
    app: tauri::AppHandle,
    profile_id: String,
    feedback_id: String,
) -> Result<Option<String>, String> {
    feedback_core::feedback_note_get(&app, &profile_id, &feedback_id)
}

#[tauri::command]
pub fn feedback_note_set(
    app: tauri::AppHandle,
    profile_id: String,
    feedback_id: String,
    note: String,
) -> Result<(), String> {
    feedback_core::feedback_note_set(&app, &profile_id, &feedback_id, &note)
}
