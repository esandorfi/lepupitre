use super::repo;
use crate::kernel::{ids, time};
use crate::platform::artifacts;
use crate::platform::db;
use tauri::AppHandle;

pub fn run_create(app: &AppHandle, profile_id: &str, project_id: &str) -> Result<String, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let mut conn = db::open_profile(app, profile_id)?;
    repo::ensure_project_exists(&conn, project_id)?;

    let id = ids::new_id("run");
    let now = time::now_rfc3339();

    let insert = repo::insert_run(&conn, &id, project_id, &now);
    if let Err(err) = insert {
        if repo::is_audio_notnull_error(&err) {
            db::ensure_runs_nullable(&mut conn)?;
            repo::insert_run(&conn, &id, project_id, &now)
                .map_err(|e| format!("run_insert: {e}"))?;
        } else {
            return Err(format!("run_insert: {err}"));
        }
    }

    Ok(id)
}

pub fn run_finish(
    app: &AppHandle,
    profile_id: &str,
    run_id: &str,
    audio_artifact_id: &str,
) -> Result<(), String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    ensure_audio_artifact(app, profile_id, audio_artifact_id)?;

    let updated = repo::update_run_audio(&conn, run_id, audio_artifact_id)?;
    if updated == 0 {
        return Err("run_not_found".to_string());
    }
    Ok(())
}

pub fn run_set_transcript(
    app: &AppHandle,
    profile_id: &str,
    run_id: &str,
    transcript_id: &str,
) -> Result<(), String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    ensure_transcript_artifact(app, profile_id, transcript_id)?;

    let updated = repo::update_run_transcript(&conn, run_id, transcript_id)?;
    if updated == 0 {
        return Err("run_not_found".to_string());
    }
    Ok(())
}

fn ensure_audio_artifact(
    app: &AppHandle,
    profile_id: &str,
    artifact_id: &str,
) -> Result<(), String> {
    let artifact = artifacts::get_artifact(app, profile_id, artifact_id)?;
    if artifact.artifact_type != "audio" {
        return Err("artifact_not_audio".to_string());
    }
    Ok(())
}

fn ensure_transcript_artifact(
    app: &AppHandle,
    profile_id: &str,
    artifact_id: &str,
) -> Result<(), String> {
    let artifact = artifacts::get_artifact(app, profile_id, artifact_id)?;
    if artifact.artifact_type != "transcript" {
        return Err("artifact_not_transcript".to_string());
    }
    Ok(())
}
