use crate::core::models;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc::{self, Receiver};
use std::thread;
use std::time::Duration;
use tauri::Manager;

const INIT_TIMEOUT: Duration = Duration::from_secs(10);
const DECODE_TIMEOUT: Duration = Duration::from_secs(30);
pub const SIDECAR_PROTOCOL_VERSION: &str = "1.0.0";
const REQUIRED_SIDECAR_CAPABILITIES: [&str; 3] =
    ["decode_window_f32le", "progress_events", "mode_live_final"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarDependencies {
    pub whisper_rs: String,
    pub whisper_cpp: String,
    pub whisper_runtime: String,
    pub ggml: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarDoctorInfo {
    pub schema_version: String,
    pub sidecar_version: String,
    pub protocol_version: String,
    pub target_triple: String,
    pub build_timestamp: Option<String>,
    pub git_commit: Option<String>,
    pub capabilities: Vec<String>,
    pub dependencies: SidecarDependencies,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarStatus {
    pub path: String,
    pub schema_version: String,
    pub sidecar_version: String,
    pub protocol_version: String,
    pub app_protocol_version: String,
    pub target_triple: String,
    pub build_timestamp: Option<String>,
    pub git_commit: Option<String>,
    pub capabilities: Vec<String>,
    pub dependencies: SidecarDependencies,
}

fn sidecar_basename() -> &'static str {
    if cfg!(target_os = "windows") {
        "lepupitre-asr.exe"
    } else {
        "lepupitre-asr"
    }
}

fn sidecar_candidate_paths(resource_dir: Option<&Path>, exe_dir: Option<&Path>) -> Vec<PathBuf> {
    let basename = sidecar_basename();
    let mut candidates = Vec::new();

    if let Some(resource_dir) = resource_dir {
        // Bundled resources in Tauri keep the sidecar under the `sidecar` subdirectory.
        candidates.push(resource_dir.join("sidecar").join(basename));
        // Backward-compatible fallback for older layouts.
        candidates.push(resource_dir.join(basename));
    }

    if let Some(exe_dir) = exe_dir {
        candidates.push(exe_dir.join(basename));

        // Dev fallback: target/debug -> target -> src-tauri/sidecar
        if let Some(dev_root) = exe_dir.parent().and_then(|parent| parent.parent()) {
            candidates.push(dev_root.join("sidecar").join(basename));
        }
    }

    candidates
}

pub fn resolve_sidecar_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(env_path) = std::env::var("LEPUPITRE_ASR_SIDECAR") {
        let candidate = PathBuf::from(env_path);
        if candidate.exists() {
            return Ok(candidate);
        }
    }
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("sidecar_resource_dir: {e}"))?;
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|dir| dir.to_path_buf()));
    for candidate in sidecar_candidate_paths(Some(resource_dir.as_path()), exe_dir.as_deref()) {
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    if cfg!(debug_assertions) {
        eprintln!(
            "asr sidecar missing (dev): set LEPUPITRE_ASR_SIDECAR or run ./scripts/build-asr-sidecar.sh --copy"
        );
    }
    Err("sidecar_missing".to_string())
}

pub fn resolve_sidecar_status(app: &tauri::AppHandle) -> Result<SidecarStatus, String> {
    let sidecar_path = resolve_sidecar_path(app)?;
    let doctor = run_sidecar_doctor(&sidecar_path)?;
    assert_sidecar_compatibility(&doctor)?;
    Ok(SidecarStatus {
        path: sidecar_path.to_string_lossy().to_string(),
        schema_version: doctor.schema_version.clone(),
        sidecar_version: doctor.sidecar_version.clone(),
        protocol_version: doctor.protocol_version.clone(),
        app_protocol_version: SIDECAR_PROTOCOL_VERSION.to_string(),
        target_triple: doctor.target_triple.clone(),
        build_timestamp: doctor.build_timestamp.clone(),
        git_commit: doctor.git_commit.clone(),
        capabilities: doctor.capabilities.clone(),
        dependencies: doctor.dependencies,
    })
}

fn run_sidecar_doctor(path: &Path) -> Result<SidecarDoctorInfo, String> {
    let output = Command::new(path)
        .arg("doctor")
        .arg("--json")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|err| {
            eprintln!("asr sidecar doctor spawn failed: {err}");
            "sidecar_doctor_failed".to_string()
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!(
            "asr sidecar doctor failed with status {:?}: {}",
            output.status.code(),
            stderr.trim()
        );
        return Err("sidecar_doctor_failed".to_string());
    }

    serde_json::from_slice::<SidecarDoctorInfo>(&output.stdout).map_err(|err| {
        eprintln!("asr sidecar doctor invalid json: {err}");
        "sidecar_doctor_invalid".to_string()
    })
}

fn assert_sidecar_compatibility(doctor: &SidecarDoctorInfo) -> Result<(), String> {
    if doctor.protocol_version != SIDECAR_PROTOCOL_VERSION {
        eprintln!(
            "asr sidecar protocol mismatch: sidecar={} app={}",
            doctor.protocol_version, SIDECAR_PROTOCOL_VERSION
        );
        return Err("sidecar_protocol_incompatible".to_string());
    }

    for required in REQUIRED_SIDECAR_CAPABILITIES {
        if !doctor
            .capabilities
            .iter()
            .any(|capability| capability == required)
        {
            eprintln!("asr sidecar missing required capability: {required}");
            return Err("sidecar_unsupported_runtime_capability".to_string());
        }
    }

    Ok(())
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum SidecarRequest {
    Init {
        model_path: String,
        sample_rate: u32,
        language: String,
    },
    Decode {
        seq: u64,
        sample_rate: u32,
        window_start_ms: i64,
        window_end_ms: i64,
        encoding: String,
        audio_b64: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        mode: Option<String>,
    },
    Shutdown,
}

#[derive(Debug, Clone, Copy)]
pub enum DecodeMode {
    Live,
    Final,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum SidecarResponse {
    Ready,
    Segments {
        seq: u64,
        segments: Vec<SidecarSegment>,
    },
    Progress {
        #[allow(dead_code)]
        seq: u64,
        #[allow(dead_code)]
        processed_ms: i64,
        #[allow(dead_code)]
        total_ms: i64,
    },
    Error {
        seq: Option<u64>,
        message: String,
    },
}

#[derive(Debug, Deserialize)]
struct SidecarSegment {
    t0_ms: i64,
    t1_ms: i64,
    text: String,
}

pub struct SidecarDecoder {
    _child: Child,
    stdin: ChildStdin,
    rx: Receiver<SidecarResponse>,
    seq: u64,
}

impl SidecarDecoder {
    pub fn spawn(path: &Path, model_path: &Path, language: &str) -> Result<Self, String> {
        let mut child = Command::new(path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|e| format!("sidecar_spawn: {e}"))?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "sidecar_stdin".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "sidecar_stdout".to_string())?;

        let (tx, rx) = mpsc::channel();
        thread::spawn(move || {
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            loop {
                line.clear();
                match reader.read_line(&mut line) {
                    Ok(0) => break,
                    Ok(_) => {
                        let trimmed = line.trim();
                        if trimmed.is_empty() {
                            continue;
                        }
                        if let Ok(response) = serde_json::from_str::<SidecarResponse>(trimmed) {
                            let _ = tx.send(response);
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        let mut decoder = Self {
            _child: child,
            stdin,
            rx,
            seq: 0,
        };

        decoder.send_request(SidecarRequest::Init {
            model_path: model_path.to_string_lossy().to_string(),
            sample_rate: 16_000,
            language: language.to_string(),
        })?;

        match decoder.rx.recv_timeout(INIT_TIMEOUT) {
            Ok(SidecarResponse::Ready) => Ok(decoder),
            Ok(SidecarResponse::Error { message, .. }) => Err(format!("sidecar_init: {message}")),
            Ok(_) => Err("sidecar_init_unexpected".to_string()),
            Err(_) => Err("sidecar_init_timeout".to_string()),
        }
    }

    pub fn decode_window(
        &mut self,
        window: &[f32],
        window_start_ms: i64,
        window_end_ms: i64,
        mode: DecodeMode,
    ) -> Result<Vec<models::TranscriptSegment>, String> {
        self.decode_window_with_progress(window, window_start_ms, window_end_ms, mode, |_, _| {})
    }

    pub fn decode_window_with_progress<F>(
        &mut self,
        window: &[f32],
        window_start_ms: i64,
        window_end_ms: i64,
        mode: DecodeMode,
        mut on_progress: F,
    ) -> Result<Vec<models::TranscriptSegment>, String>
    where
        F: FnMut(i64, i64),
    {
        self.seq = self.seq.wrapping_add(1);
        let seq = self.seq;

        let mut bytes = Vec::with_capacity(window.len() * 4);
        for sample in window {
            bytes.extend_from_slice(&sample.to_le_bytes());
        }
        let audio_b64 = base64::engine::general_purpose::STANDARD.encode(bytes);

        let mode_value = match mode {
            DecodeMode::Live => "live",
            DecodeMode::Final => "final",
        };
        self.send_request(SidecarRequest::Decode {
            seq,
            sample_rate: 16_000,
            window_start_ms,
            window_end_ms,
            encoding: "f32le".to_string(),
            audio_b64,
            mode: Some(mode_value.to_string()),
        })?;

        let deadline = std::time::Instant::now() + DECODE_TIMEOUT;
        loop {
            let timeout = deadline.saturating_duration_since(std::time::Instant::now());
            if timeout.is_zero() {
                return Err("sidecar_decode_timeout".to_string());
            }
            let response = self
                .rx
                .recv_timeout(timeout)
                .map_err(|_| "sidecar_decode_timeout".to_string())?;
            match response {
                SidecarResponse::Segments {
                    seq: resp_seq,
                    segments,
                } => {
                    if resp_seq != seq {
                        continue;
                    }
                    let mapped = segments
                        .into_iter()
                        .map(|segment| models::TranscriptSegment {
                            t_start_ms: segment.t0_ms,
                            t_end_ms: segment.t1_ms,
                            text: segment.text,
                            confidence: None,
                        })
                        .collect();
                    return Ok(mapped);
                }
                SidecarResponse::Progress {
                    seq: resp_seq,
                    processed_ms,
                    total_ms,
                } => {
                    if resp_seq != seq {
                        continue;
                    }
                    on_progress(processed_ms, total_ms);
                }
                SidecarResponse::Error {
                    seq: resp_seq,
                    message,
                } => {
                    if resp_seq.is_some() && resp_seq != Some(seq) {
                        continue;
                    }
                    return Err(format!("sidecar_decode: {message}"));
                }
                _ => continue,
            }
        }
    }

    fn send_request(&mut self, request: SidecarRequest) -> Result<(), String> {
        let payload = serde_json::to_string(&request).map_err(|e| format!("sidecar_json: {e}"))?;
        self.stdin
            .write_all(payload.as_bytes())
            .map_err(|e| format!("sidecar_write: {e}"))?;
        self.stdin
            .write_all(b"\n")
            .map_err(|e| format!("sidecar_write: {e}"))?;
        self.stdin
            .flush()
            .map_err(|e| format!("sidecar_flush: {e}"))?;
        Ok(())
    }
}

impl Drop for SidecarDecoder {
    fn drop(&mut self) {
        let _ = self.send_request(SidecarRequest::Shutdown);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn doctor_payload(protocol_version: &str, capabilities: &[&str]) -> SidecarDoctorInfo {
        SidecarDoctorInfo {
            schema_version: "1.0.0".to_string(),
            sidecar_version: "0.1.0".to_string(),
            protocol_version: protocol_version.to_string(),
            target_triple: "x86_64-pc-windows-msvc".to_string(),
            build_timestamp: Some("unix:1".to_string()),
            git_commit: Some("abc123".to_string()),
            capabilities: capabilities
                .iter()
                .map(|value| (*value).to_string())
                .collect(),
            dependencies: SidecarDependencies {
                whisper_rs: "0.15".to_string(),
                whisper_cpp: "1.7.6".to_string(),
                whisper_runtime: "1.7.6".to_string(),
                ggml: "bundled_with_whisper_cpp".to_string(),
            },
        }
    }

    #[test]
    fn sidecar_candidates_prioritize_packaged_resource_subdir() {
        let resource_dir = PathBuf::from("app").join("resources");
        let exe_dir = PathBuf::from("app").join("target").join("debug");
        let candidates =
            sidecar_candidate_paths(Some(resource_dir.as_path()), Some(exe_dir.as_path()));
        assert_eq!(
            candidates,
            vec![
                resource_dir.join("sidecar").join(sidecar_basename()),
                resource_dir.join(sidecar_basename()),
                exe_dir.join(sidecar_basename()),
                PathBuf::from("app")
                    .join("sidecar")
                    .join(sidecar_basename()),
            ]
        );
    }

    #[test]
    fn sidecar_candidates_include_dev_path_when_exe_is_target_debug() {
        let exe_dir = PathBuf::from("repo").join("target").join("debug");
        let candidates = sidecar_candidate_paths(None, Some(exe_dir.as_path()));
        assert_eq!(
            candidates,
            vec![
                exe_dir.join(sidecar_basename()),
                PathBuf::from("repo")
                    .join("sidecar")
                    .join(sidecar_basename()),
            ]
        );
    }

    #[test]
    fn sidecar_compatibility_accepts_matching_protocol_and_capabilities() {
        let payload = doctor_payload(SIDECAR_PROTOCOL_VERSION, &REQUIRED_SIDECAR_CAPABILITIES);
        let result = assert_sidecar_compatibility(&payload);
        assert!(result.is_ok());
    }

    #[test]
    fn sidecar_compatibility_rejects_protocol_mismatch() {
        let payload = doctor_payload("9.9.9", &REQUIRED_SIDECAR_CAPABILITIES);
        let err = assert_sidecar_compatibility(&payload).expect_err("must fail");
        assert_eq!(err, "sidecar_protocol_incompatible");
    }

    #[test]
    fn sidecar_compatibility_rejects_missing_capability() {
        let payload = doctor_payload(
            SIDECAR_PROTOCOL_VERSION,
            &["decode_window_f32le", "progress_events"],
        );
        let err = assert_sidecar_compatibility(&payload).expect_err("must fail");
        assert_eq!(err, "sidecar_unsupported_runtime_capability");
    }
}
