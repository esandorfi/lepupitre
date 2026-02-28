use crate::core::run as run_core;

pub use run_core::{RunAnalyzeResponse, RunSummary};

#[tauri::command]
pub fn run_create(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<String, String> {
    run_core::run_create(&app, &profile_id, &project_id)
}

#[tauri::command]
pub fn run_finish(
    app: tauri::AppHandle,
    profile_id: String,
    run_id: String,
    audio_artifact_id: String,
) -> Result<(), String> {
    run_core::run_finish(&app, &profile_id, &run_id, &audio_artifact_id)
}

#[tauri::command]
pub fn run_set_transcript(
    app: tauri::AppHandle,
    profile_id: String,
    run_id: String,
    transcript_id: String,
) -> Result<(), String> {
    run_core::run_set_transcript(&app, &profile_id, &run_id, &transcript_id)
}

#[tauri::command]
pub fn run_get_latest(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
) -> Result<Option<RunSummary>, String> {
    run_core::run_get_latest(&app, &profile_id, &project_id)
}

#[tauri::command]
pub fn run_get(
    app: tauri::AppHandle,
    profile_id: String,
    run_id: String,
) -> Result<Option<RunSummary>, String> {
    run_core::run_get(&app, &profile_id, &run_id)
}

#[tauri::command]
pub fn run_list(
    app: tauri::AppHandle,
    profile_id: String,
    project_id: String,
    limit: Option<u32>,
) -> Result<Vec<RunSummary>, String> {
    run_core::run_list(&app, &profile_id, &project_id, limit)
}

#[tauri::command]
pub fn run_analyze(
    app: tauri::AppHandle,
    profile_id: String,
    run_id: String,
) -> Result<RunAnalyzeResponse, String> {
    run_core::run_analyze(&app, &profile_id, &run_id)
}
