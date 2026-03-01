use super::PackFileEntry;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use zip::write::FileOptions;
use zip::{ZipArchive, ZipWriter};

const MAX_ZIP_ENTRY_BYTES: u64 = 64 * 1024 * 1024;

pub(super) fn write_file_from_disk(
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

pub(super) fn write_bytes(
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

pub(super) fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    let mut out = String::with_capacity(digest.len() * 2);
    for byte in digest {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}

pub(super) fn validate_zip_entries(archive: &mut ZipArchive<File>) -> Result<(), String> {
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

pub(super) fn read_zip_file(archive: &mut ZipArchive<File>, name: &str) -> Result<Vec<u8>, String> {
    let mut file = archive
        .by_name(name)
        .map_err(|e| format!("pack_missing_file: {e}"))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)
        .map_err(|e| format!("pack_read: {e}"))?;
    Ok(bytes)
}

pub(super) fn files_by_role(
    files: &[PackFileEntry],
) -> Result<HashMap<String, PackFileEntry>, String> {
    let mut map = HashMap::new();
    for entry in files {
        if map.contains_key(&entry.role) {
            return Err("manifest_duplicate_role".to_string());
        }
        map.insert(entry.role.clone(), entry.clone());
    }
    Ok(map)
}

pub(super) fn read_zip_entry_checked(
    archive: &mut ZipArchive<File>,
    entry: &PackFileEntry,
    validate_sha: bool,
    validate_size: bool,
) -> Result<Vec<u8>, String> {
    let bytes = read_zip_file(archive, &entry.path)?;
    if validate_size && bytes.len() as u64 != entry.bytes {
        return Err("pack_size_mismatch".to_string());
    }
    if validate_sha {
        ensure_sha_match(&entry.sha256, &bytes)?;
    }
    Ok(bytes)
}

fn is_symlink(file: &zip::read::ZipFile<'_>) -> bool {
    file.unix_mode()
        .map(|mode| mode & 0o170000 == 0o120000)
        .unwrap_or(false)
}

fn ensure_sha_match(expected: &str, bytes: &[u8]) -> Result<(), String> {
    if sha256_hex(bytes) != expected {
        return Err("pack_sha_mismatch".to_string());
    }
    Ok(())
}
