use crate::domain::asr::asr_models;
use crate::kernel::time;
use crate::platform::asr_sidecar;
use serde::Serialize;
use tauri::AppHandle;

const ASR_DIAGNOSTICS_SCHEMA_VERSION: &str = "1.0.0";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrDiagnosticsBundle {
    pub schema_version: String,
    pub generated_at: String,
    pub app_version: String,
    pub platform: AsrDiagnosticsPlatform,
    pub sidecar: AsrDiagnosticsSidecar,
    pub models: Vec<AsrDiagnosticsModel>,
    pub known_error_signatures: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrDiagnosticsPlatform {
    pub os: String,
    pub arch: String,
    pub family: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrDiagnosticsSidecar {
    pub status: String,
    pub path_hint: Option<String>,
    pub status_error: Option<String>,
    pub details: Option<asr_sidecar::SidecarStatus>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AsrDiagnosticsModel {
    pub id: String,
    pub installed: bool,
    pub checksum_ok: Option<bool>,
    pub size_bytes: Option<u64>,
    pub expected_bytes: u64,
    pub expected_sha256: String,
    pub source_url: String,
    pub path_hint: Option<String>,
}

pub fn build_diagnostics_bundle(
    app: &AppHandle,
    known_error_signatures: &[&str],
) -> Result<AsrDiagnosticsBundle, String> {
    let sidecar = match asr_sidecar::resolve_sidecar_status(app) {
        Ok(status) => AsrDiagnosticsSidecar {
            status: "ok".to_string(),
            path_hint: redact_path_hint(Some(status.path.as_str())),
            status_error: None,
            details: Some(status),
        },
        Err(code) => {
            let path_hint = asr_sidecar::resolve_sidecar_path(app)
                .ok()
                .and_then(|path| redact_path_hint(path.to_str()));
            AsrDiagnosticsSidecar {
                status: "error".to_string(),
                path_hint,
                status_error: Some(code),
                details: None,
            }
        }
    };

    let models = asr_models::list_models(app)?
        .into_iter()
        .map(|model| AsrDiagnosticsModel {
            id: model.id,
            installed: model.installed,
            checksum_ok: model.checksum_ok,
            size_bytes: model.size_bytes,
            expected_bytes: model.expected_bytes,
            expected_sha256: model.expected_sha256,
            source_url: model.source_url,
            path_hint: redact_path_hint(model.path.as_deref()),
        })
        .collect();

    Ok(AsrDiagnosticsBundle {
        schema_version: ASR_DIAGNOSTICS_SCHEMA_VERSION.to_string(),
        generated_at: time::now_rfc3339(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        platform: AsrDiagnosticsPlatform {
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            family: std::env::consts::FAMILY.to_string(),
        },
        sidecar,
        models,
        known_error_signatures: known_error_signatures
            .iter()
            .map(|value| (*value).to_string())
            .collect(),
    })
}

fn redact_path_hint(path: Option<&str>) -> Option<String> {
    let raw = path?.trim();
    if raw.is_empty() {
        return None;
    }
    let filename = std::path::Path::new(raw)
        .file_name()
        .and_then(|value| value.to_str())
        .map(|value| value.to_string());
    filename.or_else(|| Some("<redacted>".to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redact_path_hint_keeps_filename_only() {
        let redacted = redact_path_hint(Some("C:/Users/name/AppData/models/ggml-tiny.bin"));
        assert_eq!(redacted.as_deref(), Some("ggml-tiny.bin"));
    }

    #[test]
    fn redact_path_hint_handles_missing_values() {
        assert_eq!(redact_path_hint(None), None);
        assert_eq!(redact_path_hint(Some("   ")), None);
    }
}
