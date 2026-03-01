use super::archive;
use super::repo;
use super::types::PackManifestV1;
use crate::kernel::{ids, time};
use crate::platform::artifacts;
use crate::platform::db;
use serde::Serialize;
use std::fs::File;
use std::path::PathBuf;
use zip::ZipArchive;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerReviewImportResponse {
    pub peer_review_id: String,
    pub project_id: String,
    pub run_id: String,
}

pub fn peer_review_import(
    app: tauri::AppHandle,
    profile_id: String,
    path: String,
) -> Result<PeerReviewImportResponse, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let mut conn = db::open_profile(&app, &profile_id)?;

    let archive_path = PathBuf::from(path);
    let archive_file = File::open(&archive_path).map_err(|e| format!("pack_open: {e}"))?;
    let mut archive = ZipArchive::new(archive_file).map_err(|e| format!("pack_zip: {e}"))?;

    archive::validate_zip_entries(&mut archive)?;

    let manifest_bytes = archive::read_zip_file(&mut archive, "manifest.json")?;
    let manifest: PackManifestV1 =
        serde_json::from_slice(&manifest_bytes).map_err(|e| format!("manifest_parse: {e}"))?;
    if manifest.schema_version != "1.0.0" {
        return Err("manifest_schema_mismatch".to_string());
    }

    let files_by_role = archive::files_by_role(&manifest.files)?;
    let audio_entry = files_by_role
        .get("audio")
        .ok_or_else(|| "manifest_missing_audio".to_string())?;
    let transcript_entry = files_by_role
        .get("transcript")
        .ok_or_else(|| "manifest_missing_transcript".to_string())?;
    let outline_entry = files_by_role
        .get("outline")
        .ok_or_else(|| "manifest_missing_outline".to_string())?;
    let rubric_entry = files_by_role
        .get("rubric")
        .ok_or_else(|| "manifest_missing_rubric".to_string())?;
    let review_entry = files_by_role
        .get("review_template")
        .ok_or_else(|| "manifest_missing_review".to_string())?;

    let audio_bytes = archive::read_zip_entry_checked(&mut archive, audio_entry, true, true)?;
    let transcript_bytes =
        archive::read_zip_entry_checked(&mut archive, transcript_entry, true, true)?;
    let outline_bytes = archive::read_zip_entry_checked(&mut archive, outline_entry, true, true)?;
    let rubric_bytes = archive::read_zip_entry_checked(&mut archive, rubric_entry, true, true)?;
    let review_bytes = archive::read_zip_entry_checked(&mut archive, review_entry, false, false)?;

    let review_json: serde_json::Value =
        serde_json::from_slice(&review_bytes).map_err(|e| format!("review_parse: {e}"))?;
    let reviewer_tag = review_json
        .get("reviewer_tag")
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
        .filter(|value| !value.trim().is_empty());

    let project_id = ids::new_id("proj");
    let talk_number = repo::next_talk_number(&conn)?;
    let now = time::now_rfc3339();
    let talk_title = format!("Peer review: {}", manifest.pack_id);

    let outline_text =
        String::from_utf8(outline_bytes.clone()).map_err(|_| "outline_invalid_utf8".to_string())?;

    let audio_record = artifacts::store_bytes(
        &app,
        &profile_id,
        "audio",
        "wav",
        &audio_bytes,
        &serde_json::json!({
            "source": "peer_review_import",
            "pack_id": manifest.pack_id,
            "role": "audio",
        }),
    )?;
    let transcript_record = artifacts::store_bytes(
        &app,
        &profile_id,
        "transcript",
        "json",
        &transcript_bytes,
        &serde_json::json!({
            "source": "peer_review_import",
            "pack_id": manifest.pack_id,
            "role": "transcript",
        }),
    )?;
    let outline_record = artifacts::store_bytes(
        &app,
        &profile_id,
        "outline",
        "md",
        &outline_bytes,
        &serde_json::json!({
            "source": "peer_review_import",
            "pack_id": manifest.pack_id,
            "role": "outline",
        }),
    )?;
    let rubric_record = artifacts::store_bytes(
        &app,
        &profile_id,
        "rubric",
        "json",
        &rubric_bytes,
        &serde_json::json!({
            "source": "peer_review_import",
            "pack_id": manifest.pack_id,
            "role": "rubric",
        }),
    )?;

    let run_id = ids::new_id("run");

    let metadata = serde_json::json!({
        "source": "peer_review_import",
        "pack_id": manifest.pack_id,
        "pack_run_id": manifest.run.run_id,
        "import_run_id": run_id,
        "project_id": project_id,
    });
    let record = artifacts::store_bytes(
        &app,
        &profile_id,
        "peer_review",
        "json",
        &review_bytes,
        &metadata,
    )?;

    let review_id = ids::new_id("peer");
    let persist_result = repo::persist_peer_review_import_rows(
        &mut conn,
        repo::PeerReviewImportRows {
            project_id: &project_id,
            talk_title: &talk_title,
            talk_number,
            now: &now,
            outline_text: &outline_text,
            run_id: &run_id,
            run_created_at: &manifest.created_at,
            audio_artifact_id: &audio_record.id,
            transcript_artifact_id: &transcript_record.id,
            review_id: &review_id,
            reviewer_tag: reviewer_tag.as_deref(),
            review_json_artifact_id: &record.id,
        },
    );
    if let Err(persist_err) = persist_result {
        let cleanup_result = artifacts::delete_artifacts(
            &app,
            &profile_id,
            &[
                &audio_record.id,
                &transcript_record.id,
                &outline_record.id,
                &rubric_record.id,
                &record.id,
            ],
        );
        return match cleanup_result {
            Ok(()) => Err(persist_err),
            Err(cleanup_err) => Err(format!("{persist_err}; {cleanup_err}")),
        };
    }

    Ok(PeerReviewImportResponse {
        peer_review_id: review_id,
        project_id,
        run_id,
    })
}
