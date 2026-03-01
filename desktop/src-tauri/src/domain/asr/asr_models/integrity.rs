use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub(super) struct AsrModelManifest {
    pub(super) sha256: String,
    pub(super) size_bytes: u64,
}

pub(super) fn read_manifest(path: &Path) -> Option<AsrModelManifest> {
    let data = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&data).ok()
}

pub(super) fn write_manifest(path: &Path, manifest: &AsrModelManifest) -> Result<(), String> {
    let payload = serde_json::to_string(manifest).map_err(|e| format!("manifest_json: {e}"))?;
    std::fs::write(path, payload).map_err(|e| format!("manifest_write: {e}"))?;
    Ok(())
}

pub(super) fn sha256_file(path: &Path) -> Result<(String, u64), String> {
    let mut file = File::open(path).map_err(|e| format!("model_open: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    let mut total = 0u64;

    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|e| format!("model_read: {e}"))?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
        total += read as u64;
    }

    Ok((to_hex(&hasher.finalize()), total))
}

fn to_hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}
