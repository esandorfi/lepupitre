use serde::{Deserialize, Serialize};
use std::io::{self, BufRead, Write};

const SEGMENT_MS: i64 = 1200;

#[derive(Debug, Deserialize)]
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

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum SidecarResponse {
    Ready,
    Segments { seq: u64, segments: Vec<SidecarSegment> },
    Error { seq: Option<u64>, message: String },
}

#[derive(Debug, Serialize)]
struct SidecarSegment {
    t0_ms: i64,
    t1_ms: i64,
    text: String,
}

struct SidecarState {
    initialized: bool,
}

fn main() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();
    let mut state = SidecarState { initialized: false };

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(line) => line,
            Err(err) => {
                emit(
                    &mut stdout,
                    SidecarResponse::Error {
                        seq: None,
                        message: format!("stdin_read: {err}"),
                    },
                );
                break;
            }
        };
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let request: SidecarRequest = match serde_json::from_str(trimmed) {
            Ok(request) => request,
            Err(err) => {
                emit(
                    &mut stdout,
                    SidecarResponse::Error {
                        seq: None,
                        message: format!("parse: {err}"),
                    },
                );
                continue;
            }
        };

        match request {
            SidecarRequest::Init {
                model_path,
                sample_rate,
                language,
            } => {
                let _ = (model_path, sample_rate, language);
                state.initialized = true;
                emit(&mut stdout, SidecarResponse::Ready);
            }
            SidecarRequest::Decode {
                seq,
                window_start_ms,
                window_end_ms,
                ..
            } => {
                if !state.initialized {
                    emit(
                        &mut stdout,
                        SidecarResponse::Error {
                            seq: Some(seq),
                            message: "not_initialized".to_string(),
                        },
                    );
                    continue;
                }
                let segments = build_segments(window_start_ms, window_end_ms, seq);
                emit(&mut stdout, SidecarResponse::Segments { seq, segments });
            }
            SidecarRequest::Shutdown => {
                break;
            }
        }
    }
}

fn build_segments(window_start_ms: i64, window_end_ms: i64, seq: u64) -> Vec<SidecarSegment> {
    if window_end_ms <= window_start_ms {
        return Vec::new();
    }
    let mut segments = Vec::new();
    let mut cursor = window_start_ms;
    let mut index = 1;
    while cursor < window_end_ms {
        let end = (cursor + SEGMENT_MS).min(window_end_ms);
        segments.push(SidecarSegment {
            t0_ms: cursor,
            t1_ms: end,
            text: format!("segment {seq}.{index}"),
        });
        index += 1;
        cursor = end;
    }
    segments
}

fn emit(stdout: &mut io::Stdout, response: SidecarResponse) {
    if let Ok(payload) = serde_json::to_string(&response) {
        let _ = writeln!(stdout, "{payload}");
        let _ = stdout.flush();
    }
}
