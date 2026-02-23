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

const INIT_TIMEOUT: Duration = Duration::from_secs(3);
const DECODE_TIMEOUT: Duration = Duration::from_secs(3);

fn sidecar_basename() -> &'static str {
    if cfg!(target_os = "windows") {
        "lepupitre-asr.exe"
    } else {
        "lepupitre-asr"
    }
}

pub fn resolve_sidecar_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("sidecar_resource_dir: {e}"))?;
    let resource_path = resource_dir.join(sidecar_basename());
    if resource_path.exists() {
        return Ok(resource_path);
    }

    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|dir| dir.to_path_buf()));
    if let Some(dir) = exe_dir {
        let exe_path = dir.join(sidecar_basename());
        if exe_path.exists() {
            return Ok(exe_path);
        }
    }

    Err("sidecar_missing".to_string())
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
    },
    Shutdown,
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
    ) -> Result<Vec<models::TranscriptSegment>, String> {
        self.seq = self.seq.wrapping_add(1);
        let seq = self.seq;

        let mut bytes = Vec::with_capacity(window.len() * 4);
        for sample in window {
            bytes.extend_from_slice(&sample.to_le_bytes());
        }
        let audio_b64 = base64::engine::general_purpose::STANDARD.encode(bytes);

        self.send_request(SidecarRequest::Decode {
            seq,
            sample_rate: 16_000,
            window_start_ms,
            window_end_ms,
            encoding: "f32le".to_string(),
            audio_b64,
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
