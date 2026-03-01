use super::archive;
use super::types::PackManifestV1;
use crate::platform::db;
use serde::Serialize;
use std::collections::HashMap;
use std::fs::File;
use std::path::PathBuf;
use zip::ZipArchive;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackFileSummary {
    pub role: String,
    pub bytes: u64,
    pub mime: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackInspectResponse {
    pub file_name: String,
    pub file_bytes: u64,
    pub schema_version: String,
    pub pack_id: String,
    pub created_at: String,
    pub app_version: String,
    pub profile_id: Option<String>,
    pub project_id: String,
    pub run_id: String,
    pub duration_ms: i64,
    pub reviewer_tag: Option<String>,
    pub files: Vec<PackFileSummary>,
}

pub fn pack_inspect(
    app: tauri::AppHandle,
    profile_id: String,
    path: String,
) -> Result<PackInspectResponse, String> {
    db::ensure_profile_exists(&app, &profile_id)?;

    let archive_path = PathBuf::from(path);
    let file_name = archive_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("pack.zip")
        .to_string();
    let file_bytes = std::fs::metadata(&archive_path)
        .map_err(|e| format!("pack_stat: {e}"))?
        .len();

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

    let mut actual_sizes = HashMap::new();
    actual_sizes.insert("audio".to_string(), audio_bytes.len() as u64);
    actual_sizes.insert("transcript".to_string(), transcript_bytes.len() as u64);
    actual_sizes.insert("outline".to_string(), outline_bytes.len() as u64);
    actual_sizes.insert("rubric".to_string(), rubric_bytes.len() as u64);
    actual_sizes.insert("review_template".to_string(), review_bytes.len() as u64);

    let files = manifest
        .files
        .iter()
        .map(|entry| PackFileSummary {
            role: entry.role.clone(),
            bytes: actual_sizes
                .get(&entry.role)
                .copied()
                .unwrap_or(entry.bytes),
            mime: entry.mime.clone(),
        })
        .collect();

    Ok(PackInspectResponse {
        file_name,
        file_bytes,
        schema_version: manifest.schema_version,
        pack_id: manifest.pack_id,
        created_at: manifest.created_at,
        app_version: manifest.app_version,
        profile_id: manifest.profile_id,
        project_id: manifest.project_id,
        run_id: manifest.run.run_id,
        duration_ms: manifest.run.duration_ms,
        reviewer_tag,
        files,
    })
}
