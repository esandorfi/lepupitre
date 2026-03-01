use crate::domain::asr::transcript;
use crate::kernel::models;
use crate::kernel::{ids, time};
use crate::platform::artifacts;
use crate::platform::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::path::PathBuf;
use zip::write::FileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

mod archive;
mod repo;

const RUBRIC_JSON: &str = include_str!("../../../../../seed/rubric.tech_talk_internal.v1.json");

#[derive(Debug, Serialize, Deserialize, Clone)]
struct PackManifestV1 {
    schema_version: String,
    pack_id: String,
    created_at: String,
    app_version: String,
    profile_id: Option<String>,
    project_id: String,
    run: PackRun,
    files: Vec<PackFileEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct PackRun {
    run_id: String,
    duration_ms: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct PackFileEntry {
    path: String,
    role: String,
    sha256: String,
    bytes: u64,
    mime: String,
}

pub fn pack_export(
    app: tauri::AppHandle,
    profile_id: String,
    run_id: String,
) -> Result<models::ExportResult, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let (project_id, audio_id, transcript_id): (String, Option<String>, Option<String>) = conn
        .query_row(
            "SELECT project_id, audio_artifact_id, transcript_id FROM runs WHERE id = ?1",
            params![run_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| format!("run_lookup: {e}"))?;
    let audio_id = audio_id.ok_or_else(|| "run_missing_audio".to_string())?;
    let transcript_id = transcript_id.ok_or_else(|| "run_missing_transcript".to_string())?;

    let project_title: String = conn
        .query_row(
            "SELECT title FROM talk_projects WHERE id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("project_lookup: {e}"))?;

    let audio = repo::load_artifact(&conn, &audio_id, "audio")?;
    let transcript_artifact = repo::load_artifact(&conn, &transcript_id, "transcript")?;

    let transcript_path = artifact_path(&app, &profile_id, &transcript_artifact.relpath)?;
    let transcript_doc = transcript::load_transcript(&app, &profile_id, &transcript_id)?;
    let duration_ms = transcript_doc
        .duration_ms
        .or_else(|| transcript::transcript_duration_ms(&transcript_doc))
        .unwrap_or(0);

    let outline = repo::outline_markdown(&conn, &project_id, &project_title)?;
    let outline_bytes = outline.as_bytes().to_vec();

    let rubric_bytes = RUBRIC_JSON.as_bytes().to_vec();
    let review_bytes = build_review_template(&rubric_bytes)?;
    let viewer_bytes = build_viewer_html(&project_title).into_bytes();

    let files = vec![
        PackFileEntry {
            path: "run/audio.wav".to_string(),
            role: "audio".to_string(),
            sha256: audio.sha256.clone(),
            bytes: audio.bytes,
            mime: "audio/wav".to_string(),
        },
        PackFileEntry {
            path: "run/transcript.json".to_string(),
            role: "transcript".to_string(),
            sha256: transcript_artifact.sha256.clone(),
            bytes: transcript_artifact.bytes,
            mime: "application/json".to_string(),
        },
        PackFileEntry {
            path: "run/outline.md".to_string(),
            role: "outline".to_string(),
            sha256: archive::sha256_hex(&outline_bytes),
            bytes: outline_bytes.len() as u64,
            mime: "text/markdown".to_string(),
        },
        PackFileEntry {
            path: "rubric/rubric.json".to_string(),
            role: "rubric".to_string(),
            sha256: archive::sha256_hex(&rubric_bytes),
            bytes: rubric_bytes.len() as u64,
            mime: "application/json".to_string(),
        },
        PackFileEntry {
            path: "review/review_template.json".to_string(),
            role: "review_template".to_string(),
            sha256: archive::sha256_hex(&review_bytes),
            bytes: review_bytes.len() as u64,
            mime: "application/json".to_string(),
        },
        PackFileEntry {
            path: "viewer/index.html".to_string(),
            role: "viewer".to_string(),
            sha256: archive::sha256_hex(&viewer_bytes),
            bytes: viewer_bytes.len() as u64,
            mime: "text/html".to_string(),
        },
    ];

    let pack_id = ids::new_id("pack");
    let created_at = time::now_rfc3339();
    let manifest = PackManifestV1 {
        schema_version: "1.0.0".to_string(),
        pack_id: pack_id.clone(),
        created_at: created_at.clone(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        profile_id: Some(profile_id.clone()),
        project_id: project_id.clone(),
        run: PackRun {
            run_id: run_id.clone(),
            duration_ms,
        },
        files,
    };
    let manifest_json =
        serde_json::to_vec_pretty(&manifest).map_err(|e| format!("manifest_json: {e}"))?;

    let profile_dir = db::profile_dir(&app, &profile_id)?;
    let pack_dir = profile_dir.join("artifacts").join("packs");
    std::fs::create_dir_all(&pack_dir).map_err(|e| format!("pack_dir: {e}"))?;
    let pack_path = pack_dir.join(format!("{pack_id}.zip"));

    let pack_file = File::create(&pack_path).map_err(|e| format!("pack_create: {e}"))?;
    let mut zip = ZipWriter::new(pack_file);

    let stored = FileOptions::default().compression_method(CompressionMethod::Stored);
    let deflated = FileOptions::default().compression_method(CompressionMethod::Deflated);

    archive::write_file_from_disk(
        &mut zip,
        "run/audio.wav",
        &artifact_path(&app, &profile_id, &audio.relpath)?,
        stored,
    )?;
    archive::write_file_from_disk(&mut zip, "run/transcript.json", &transcript_path, deflated)?;
    archive::write_bytes(&mut zip, "run/outline.md", &outline_bytes, deflated)?;
    archive::write_bytes(&mut zip, "rubric/rubric.json", &rubric_bytes, deflated)?;
    archive::write_bytes(
        &mut zip,
        "review/review_template.json",
        &review_bytes,
        deflated,
    )?;
    archive::write_bytes(&mut zip, "viewer/index.html", &viewer_bytes, deflated)?;
    archive::write_bytes(&mut zip, "manifest.json", &manifest_json, deflated)?;

    zip.finish().map_err(|e| format!("pack_finish: {e}"))?;

    let relpath = format!("artifacts/packs/{pack_id}.zip");
    let metadata = serde_json::json!({
        "run_id": run_id,
        "project_id": project_id,
        "pack_id": pack_id,
    });
    artifacts::register_existing_file(
        &app,
        &profile_id,
        &pack_id,
        "pack",
        &relpath,
        &pack_path,
        &metadata,
    )?;

    Ok(models::ExportResult {
        path: pack_path.to_string_lossy().to_string(),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerReviewImportResponse {
    pub peer_review_id: String,
    pub project_id: String,
    pub run_id: String,
}

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
    let _audio_entry = files_by_role
        .get("audio")
        .ok_or_else(|| "manifest_missing_audio".to_string())?;
    let _transcript_entry = files_by_role
        .get("transcript")
        .ok_or_else(|| "manifest_missing_transcript".to_string())?;
    let _outline_entry = files_by_role
        .get("outline")
        .ok_or_else(|| "manifest_missing_outline".to_string())?;
    let _rubric_entry = files_by_role
        .get("rubric")
        .ok_or_else(|| "manifest_missing_rubric".to_string())?;
    let review_entry = files_by_role
        .get("review_template")
        .ok_or_else(|| "manifest_missing_review".to_string())?;

    let audio_bytes = archive::read_zip_entry_checked(&mut archive, _audio_entry, true, true)?;
    let transcript_bytes =
        archive::read_zip_entry_checked(&mut archive, _transcript_entry, true, true)?;
    let outline_bytes = archive::read_zip_entry_checked(&mut archive, _outline_entry, true, true)?;
    let rubric_bytes = archive::read_zip_entry_checked(&mut archive, _rubric_entry, true, true)?;
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

fn artifact_path(
    app: &tauri::AppHandle,
    profile_id: &str,
    relpath: &str,
) -> Result<PathBuf, String> {
    let profile_dir = db::profile_dir(app, profile_id)?;
    Ok(profile_dir.join(relpath))
}

fn build_review_template(rubric_bytes: &[u8]) -> Result<Vec<u8>, String> {
    let rubric: serde_json::Value =
        serde_json::from_slice(rubric_bytes).map_err(|e| format!("rubric_parse: {e}"))?;
    let rubric_id = rubric
        .get("rubric_id")
        .and_then(|value| value.as_str())
        .ok_or_else(|| "rubric_id_missing".to_string())?;
    let items = rubric
        .get("items")
        .and_then(|value| value.as_array())
        .ok_or_else(|| "rubric_items_missing".to_string())?;
    let required = rubric
        .get("required_free_text")
        .and_then(|value| value.as_array())
        .ok_or_else(|| "rubric_free_text_missing".to_string())?;

    let mut scores = serde_json::Map::new();
    for item in items {
        if let Some(key) = item.get("key").and_then(|value| value.as_str()) {
            scores.insert(key.to_string(), serde_json::Value::from(3));
        }
    }
    let mut free_text = serde_json::Map::new();
    for item in required {
        if let Some(key) = item.get("key").and_then(|value| value.as_str()) {
            free_text.insert(key.to_string(), serde_json::Value::from(""));
        }
    }

    let template = serde_json::json!({
        "schema_version": "1.0.0",
        "rubric_id": rubric_id,
        "reviewer_tag": "",
        "scores": scores,
        "free_text": free_text,
        "timestamps": []
    });
    serde_json::to_vec_pretty(&template).map_err(|e| format!("review_template_json: {e}"))
}

fn build_viewer_html(title: &str) -> String {
    let escaped = escape_html(title);
    format!(
        "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\" />\n<title>{escaped}</title>\n</head>\n<body>\n<h1>{escaped}</h1>\n<p>Open audio.wav and transcript.json from the pack.</p>\n</body>\n</html>\n"
    )
}

fn escape_html(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(ch),
        }
    }
    out
}
