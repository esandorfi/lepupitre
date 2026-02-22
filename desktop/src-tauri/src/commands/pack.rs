use crate::core::{artifacts, db, ids, models, time, transcript};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use zip::write::FileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

const RUBRIC_JSON: &str = include_str!("../../../../seed/rubric.tech_talk_internal.v1.json");
const MAX_ZIP_ENTRY_BYTES: u64 = 64 * 1024 * 1024;

#[derive(Debug)]
struct ArtifactRow {
    relpath: String,
    sha256: String,
    bytes: u64,
}

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

#[tauri::command]
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

    let audio = load_artifact(&conn, &audio_id, "audio")?;
    let transcript_artifact = load_artifact(&conn, &transcript_id, "transcript")?;

    let transcript_path = artifact_path(&app, &profile_id, &transcript_artifact.relpath)?;
    let transcript_doc = transcript::load_transcript(&app, &profile_id, &transcript_id)?;
    let duration_ms = transcript_doc
        .duration_ms
        .or_else(|| transcript::transcript_duration_ms(&transcript_doc))
        .unwrap_or(0);

    let outline = outline_markdown(&conn, &project_id, &project_title)?;
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
            sha256: sha256_hex(&outline_bytes),
            bytes: outline_bytes.len() as u64,
            mime: "text/markdown".to_string(),
        },
        PackFileEntry {
            path: "rubric/rubric.json".to_string(),
            role: "rubric".to_string(),
            sha256: sha256_hex(&rubric_bytes),
            bytes: rubric_bytes.len() as u64,
            mime: "application/json".to_string(),
        },
        PackFileEntry {
            path: "review/review_template.json".to_string(),
            role: "review_template".to_string(),
            sha256: sha256_hex(&review_bytes),
            bytes: review_bytes.len() as u64,
            mime: "application/json".to_string(),
        },
        PackFileEntry {
            path: "viewer/index.html".to_string(),
            role: "viewer".to_string(),
            sha256: sha256_hex(&viewer_bytes),
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

    write_file_from_disk(
        &mut zip,
        "run/audio.wav",
        &artifact_path(&app, &profile_id, &audio.relpath)?,
        stored,
    )?;
    write_file_from_disk(&mut zip, "run/transcript.json", &transcript_path, deflated)?;
    write_bytes(&mut zip, "run/outline.md", &outline_bytes, deflated)?;
    write_bytes(&mut zip, "rubric/rubric.json", &rubric_bytes, deflated)?;
    write_bytes(
        &mut zip,
        "review/review_template.json",
        &review_bytes,
        deflated,
    )?;
    write_bytes(&mut zip, "viewer/index.html", &viewer_bytes, deflated)?;
    write_bytes(&mut zip, "manifest.json", &manifest_json, deflated)?;

    zip.finish().map_err(|e| format!("pack_finish: {e}"))?;

    let (pack_sha, pack_bytes) = file_sha256(&pack_path)?;
    let relpath = format!("artifacts/packs/{pack_id}.zip");
    let metadata = serde_json::json!({
        "run_id": run_id,
        "project_id": project_id,
        "pack_id": pack_id,
    });
    conn.execute(
        "INSERT INTO artifacts (id, type, local_relpath, sha256, bytes, created_at, metadata_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            pack_id,
            "pack",
            relpath,
            pack_sha,
            pack_bytes as i64,
            created_at,
            serde_json::to_string(&metadata).map_err(|e| format!("pack_metadata: {e}"))?
        ],
    )
    .map_err(|e| format!("pack_insert: {e}"))?;

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

#[tauri::command]
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

    validate_zip_entries(&mut archive)?;

    let manifest_bytes = read_zip_file(&mut archive, "manifest.json")?;
    let manifest: PackManifestV1 =
        serde_json::from_slice(&manifest_bytes).map_err(|e| format!("manifest_parse: {e}"))?;
    if manifest.schema_version != "1.0.0" {
        return Err("manifest_schema_mismatch".to_string());
    }

    let files_by_role = files_by_role(&manifest.files);
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

    let review_bytes = read_zip_file(&mut archive, &review_entry.path)?;
    let review_json: serde_json::Value =
        serde_json::from_slice(&review_bytes).map_err(|e| format!("review_parse: {e}"))?;
    let reviewer_tag = review_json
        .get("reviewer_tag")
        .and_then(|value| value.as_str())
        .map(|value| value.to_string())
        .filter(|value| !value.trim().is_empty());

    let files = manifest
        .files
        .iter()
        .map(|entry| PackFileSummary {
            role: entry.role.clone(),
            bytes: entry.bytes,
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

#[tauri::command]
pub fn peer_review_import(
    app: tauri::AppHandle,
    profile_id: String,
    path: String,
) -> Result<PeerReviewImportResponse, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let conn = db::open_profile(&app, &profile_id)?;

    let archive_path = PathBuf::from(path);
    let archive_file = File::open(&archive_path).map_err(|e| format!("pack_open: {e}"))?;
    let mut archive = ZipArchive::new(archive_file).map_err(|e| format!("pack_zip: {e}"))?;

    validate_zip_entries(&mut archive)?;

    let manifest_bytes = read_zip_file(&mut archive, "manifest.json")?;
    let manifest: PackManifestV1 =
        serde_json::from_slice(&manifest_bytes).map_err(|e| format!("manifest_parse: {e}"))?;
    if manifest.schema_version != "1.0.0" {
        return Err("manifest_schema_mismatch".to_string());
    }

    let files_by_role = files_by_role(&manifest.files);
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

    let audio_bytes = read_zip_file(&mut archive, &audio_entry.path)?;
    ensure_sha_match(&audio_entry.sha256, &audio_bytes)?;
    let transcript_bytes = read_zip_file(&mut archive, &transcript_entry.path)?;
    ensure_sha_match(&transcript_entry.sha256, &transcript_bytes)?;
    let outline_bytes = read_zip_file(&mut archive, &outline_entry.path)?;
    ensure_sha_match(&outline_entry.sha256, &outline_bytes)?;
    let rubric_bytes = read_zip_file(&mut archive, &rubric_entry.path)?;
    ensure_sha_match(&rubric_entry.sha256, &rubric_bytes)?;
    let review_bytes = read_zip_file(&mut archive, &review_entry.path)?;
    ensure_sha_match(&review_entry.sha256, &review_bytes)?;

    let review_json: serde_json::Value =
        serde_json::from_slice(&review_bytes).map_err(|e| format!("review_parse: {e}"))?;
    let reviewer_tag = review_json
        .get("reviewer_tag")
        .and_then(|value| value.as_str())
        .map(|value| value.to_string());

    let project_id = ids::new_id("proj");
    let talk_number = next_talk_number(&conn)?;
    let now = time::now_rfc3339();
    let talk_title = format!("Peer review: {}", manifest.pack_id);
    conn.execute(
        "INSERT INTO talk_projects (id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            project_id,
            talk_title,
            Option::<String>::None,
            Option::<String>::None,
            Option::<i64>::None,
            talk_number,
            "peer_review",
            now,
            now
        ],
    )
    .map_err(|e| format!("project_insert: {e}"))?;

    let outline_text = String::from_utf8(outline_bytes.clone())
        .map_err(|_| "outline_invalid_utf8".to_string())?;
    conn.execute(
        "INSERT INTO talk_outlines (project_id, outline_md, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![project_id, outline_text, now, now],
    )
    .map_err(|e| format!("outline_insert: {e}"))?;

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
    let _outline_record = artifacts::store_bytes(
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
    let _rubric_record = artifacts::store_bytes(
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
    conn.execute(
        "INSERT INTO runs (id, project_id, created_at, audio_artifact_id, transcript_id)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            run_id,
            project_id,
            manifest.created_at,
            audio_record.id,
            transcript_record.id
        ],
    )
    .map_err(|e| format!("run_insert: {e}"))?;

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
    conn.execute(
        "INSERT INTO peer_reviews (id, run_id, created_at, reviewer_tag, review_json_artifact_id)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![review_id, run_id, now, reviewer_tag, record.id],
    )
    .map_err(|e| format!("peer_review_insert: {e}"))?;

    Ok(PeerReviewImportResponse {
        peer_review_id: review_id,
        project_id,
        run_id,
    })
}

fn load_artifact(
    conn: &rusqlite::Connection,
    artifact_id: &str,
    expected_type: &str,
) -> Result<ArtifactRow, String> {
    let row = conn
        .query_row(
            "SELECT local_relpath, sha256, bytes, type FROM artifacts WHERE id = ?1",
            params![artifact_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, String>(3)?,
                ))
            },
        )
        .map_err(|e| format!("artifact_lookup: {e}"))?;
    if row.3 != expected_type {
        return Err("artifact_type_mismatch".to_string());
    }
    Ok(ArtifactRow {
        relpath: row.0,
        sha256: row.1,
        bytes: row.2 as u64,
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

fn outline_markdown(
    conn: &rusqlite::Connection,
    project_id: &str,
    project_title: &str,
) -> Result<String, String> {
    let stored: Option<String> = conn
        .query_row(
            "SELECT outline_md FROM talk_outlines WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("outline_lookup: {e}"))?;
    Ok(stored.unwrap_or_else(|| default_outline(project_title)))
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
    format!(
        "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\" />\n<title>{title}</title>\n</head>\n<body>\n<h1>{title}</h1>\n<p>Open audio.wav and transcript.json from the pack.</p>\n</body>\n</html>\n"
    )
}

fn default_outline(title: &str) -> String {
    format!(
        "# {title}\n\n## Opening\n- Hook\n- Promise\n\n## Key points\n- Point 1\n- Point 2\n- Point 3\n\n## Closing\n- Summary\n- Call to action\n"
    )
}

fn write_file_from_disk(
    zip: &mut ZipWriter<File>,
    path: &str,
    source: &Path,
    options: FileOptions,
) -> Result<(), String> {
    zip.start_file(path, options)
        .map_err(|e| format!("zip_start: {e}"))?;
    let mut file = File::open(source).map_err(|e| format!("zip_source: {e}"))?;
    std::io::copy(&mut file, zip).map_err(|e| format!("zip_copy: {e}"))?;
    Ok(())
}

fn write_bytes(
    zip: &mut ZipWriter<File>,
    path: &str,
    bytes: &[u8],
    options: FileOptions,
) -> Result<(), String> {
    zip.start_file(path, options)
        .map_err(|e| format!("zip_start: {e}"))?;
    zip.write_all(bytes)
        .map_err(|e| format!("zip_write: {e}"))?;
    Ok(())
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    let mut out = String::with_capacity(digest.len() * 2);
    for byte in digest {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}

fn file_sha256(path: &Path) -> Result<(String, u64), String> {
    let mut file = File::open(path).map_err(|e| format!("pack_hash_open: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    let mut total = 0u64;
    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|e| format!("pack_hash: {e}"))?;
        if read == 0 {
            break;
        }
        total += read as u64;
        hasher.update(&buffer[..read]);
    }
    Ok((sha256_hex(&hasher.finalize()), total))
}

fn validate_zip_entries(archive: &mut ZipArchive<File>) -> Result<(), String> {
    for i in 0..archive.len() {
        let file = archive
            .by_index(i)
            .map_err(|e| format!("pack_entry: {e}"))?;
        let name = file.name();
        if name.contains('\\') {
            return Err("pack_invalid_path".to_string());
        }
        let path = Path::new(name);
        if path.is_absolute() {
            return Err("pack_invalid_path".to_string());
        }
        for component in path.components() {
            if matches!(
                component,
                std::path::Component::ParentDir | std::path::Component::RootDir
            ) {
                return Err("pack_invalid_path".to_string());
            }
        }
        if is_symlink(&file) {
            return Err("pack_symlink_rejected".to_string());
        }
        if file.size() > MAX_ZIP_ENTRY_BYTES {
            return Err("pack_entry_too_large".to_string());
        }
    }
    Ok(())
}

fn is_symlink(file: &zip::read::ZipFile<'_>) -> bool {
    file.unix_mode()
        .map(|mode| mode & 0o170000 == 0o120000)
        .unwrap_or(false)
}

fn read_zip_file(archive: &mut ZipArchive<File>, name: &str) -> Result<Vec<u8>, String> {
    let mut file = archive
        .by_name(name)
        .map_err(|e| format!("pack_missing_file: {e}"))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)
        .map_err(|e| format!("pack_read: {e}"))?;
    Ok(bytes)
}

fn files_by_role(files: &[PackFileEntry]) -> HashMap<String, PackFileEntry> {
    let mut map = HashMap::new();
    for entry in files {
        if !map.contains_key(&entry.role) {
            map.insert(entry.role.clone(), entry.clone());
        }
    }
    map
}

fn ensure_sha_match(expected: &str, bytes: &[u8]) -> Result<(), String> {
    if sha256_hex(bytes) != expected {
        return Err("pack_sha_mismatch".to_string());
    }
    Ok(())
}

fn next_talk_number(conn: &rusqlite::Connection) -> Result<i64, String> {
    let max_value: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(talk_number), 0) FROM talk_projects",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("talk_number_max: {e}"))?;
    Ok(max_value + 1)
}
