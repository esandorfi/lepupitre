use crate::domain::asr::transcript;
use crate::kernel::models;
use crate::kernel::{ids, time};
use crate::platform::artifacts;
use crate::platform::db;
use rusqlite::params;
use std::fs::File;
use std::path::PathBuf;
use zip::write::FileOptions;
use zip::{CompressionMethod, ZipWriter};

mod archive;
mod content;
mod import;
mod inspect;
mod repo;
mod types;

pub use import::{peer_review_import, PeerReviewImportResponse};
pub use inspect::{pack_inspect, PackInspectResponse};
use types::{PackFileEntry, PackManifestV1, PackRun};

const RUBRIC_JSON: &str = include_str!("../../../../../seed/rubric.tech_talk_internal.v1.json");

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
    let review_bytes = content::build_review_template(&rubric_bytes)?;
    let viewer_bytes = content::build_viewer_html(&project_title).into_bytes();

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

pub(super) fn artifact_path(
    app: &tauri::AppHandle,
    profile_id: &str,
    relpath: &str,
) -> Result<PathBuf, String> {
    artifacts::resolve_profile_relpath_for_read(app, profile_id, relpath)
}
