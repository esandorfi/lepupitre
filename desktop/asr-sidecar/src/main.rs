use base64::Engine;
use serde::{Deserialize, Serialize};
use std::io::{self, BufRead, Write};
use whisper_rs::{
    install_logging_hooks, FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters,
    WhisperState,
};

const SIDECAR_PROTOCOL_VERSION: &str = "1.0.0";
const SIDECAR_DOCTOR_SCHEMA_VERSION: &str = "1.0.0";
const WHISPER_RS_DEP_VERSION: &str = "0.15";
const REQUIRED_CAPABILITY_DECODE_F32LE: &str = "decode_window_f32le";
const REQUIRED_CAPABILITY_PROGRESS_EVENTS: &str = "progress_events";
const REQUIRED_CAPABILITY_MODE_SWITCH: &str = "mode_live_final";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SidecarDoctorOutput {
    schema_version: String,
    sidecar_version: String,
    protocol_version: String,
    target_triple: String,
    build_timestamp: Option<String>,
    git_commit: Option<String>,
    capabilities: Vec<String>,
    dependencies: SidecarDoctorDependencies,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SidecarDoctorDependencies {
    whisper_rs: String,
    whisper_cpp: String,
    whisper_runtime: String,
    ggml: String,
}

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
        #[serde(default)]
        mode: Option<String>,
    },
    Shutdown,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum SidecarResponse {
    Ready,
    Segments {
        seq: u64,
        segments: Vec<SidecarSegment>,
    },
    Progress {
        seq: u64,
        processed_ms: i64,
        total_ms: i64,
    },
    Error {
        seq: Option<u64>,
        message: String,
    },
}

#[derive(Debug, Serialize)]
struct SidecarSegment {
    t0_ms: i64,
    t1_ms: i64,
    text: String,
}

#[derive(Clone, Copy, Debug)]
enum DecodeMode {
    Live,
    Final,
}

struct SidecarState {
    initialized: bool,
    context: Option<WhisperContext>,
    state: Option<WhisperState>,
    language: Option<String>,
    sample_rate: u32,
}

impl SidecarState {
    fn new() -> Self {
        Self {
            initialized: false,
            context: None,
            state: None,
            language: None,
            sample_rate: 16_000,
        }
    }

    fn init(&mut self, model_path: &str, sample_rate: u32, language: &str) -> Result<(), String> {
        if sample_rate != 16_000 {
            return Err(format!("unsupported_sample_rate:{sample_rate}"));
        }

        let params = WhisperContextParameters::default();
        let context = WhisperContext::new_with_params(model_path, params)
            .map_err(|e| format!("model_load: {e}"))?;
        let state = context
            .create_state()
            .map_err(|e| format!("state_create: {e}"))?;

        self.context = Some(context);
        self.state = Some(state);
        self.sample_rate = sample_rate;
        self.language = normalize_language(language);
        self.initialized = true;
        Ok(())
    }

    fn decode(&mut self, request: DecodeRequest) -> Result<Vec<SidecarSegment>, String> {
        if !self.initialized {
            return Err("not_initialized".to_string());
        }
        if request.sample_rate != self.sample_rate {
            return Err(format!("unsupported_sample_rate:{:?}", request.sample_rate));
        }
        if request.encoding != "f32le" {
            return Err(format!("unsupported_encoding:{}", request.encoding));
        }

        let samples = decode_f32_audio(&request.audio_b64)?;
        if samples.is_empty() {
            return Ok(Vec::new());
        }

        let total_ms = total_ms(
            request.window_start_ms,
            request.window_end_ms,
            &samples,
            request.sample_rate,
        );
        if total_ms > 0 {
            let mut stdout = io::stdout();
            emit(
                &mut stdout,
                SidecarResponse::Progress {
                    seq: request.seq,
                    processed_ms: 0,
                    total_ms,
                },
            );
        }

        let params = build_params(
            request.mode,
            self.language.as_deref(),
            total_ms,
            request.seq,
        );
        let state = self
            .state
            .as_mut()
            .ok_or_else(|| "state_missing".to_string())?;
        state
            .full(params, &samples)
            .map_err(|e| format!("decode: {e}"))?;

        let mut segments = Vec::new();
        let window_start_ms = request.window_start_ms;
        let window_end_ms = if request.window_end_ms > request.window_start_ms {
            request.window_end_ms
        } else {
            request.window_start_ms + total_ms
        };
        for segment in state.as_iter() {
            let mut t0_ms = window_start_ms + segment.start_timestamp() as i64 * 10;
            let mut t1_ms = window_start_ms + segment.end_timestamp() as i64 * 10;
            if t1_ms <= window_start_ms || t0_ms >= window_end_ms {
                continue;
            }
            if t0_ms < window_start_ms {
                t0_ms = window_start_ms;
            }
            if t1_ms > window_end_ms {
                t1_ms = window_end_ms;
            }
            let text = segment.to_string();
            let text = text.trim();
            if text.is_empty() {
                continue;
            }
            segments.push(SidecarSegment {
                t0_ms,
                t1_ms,
                text: text.to_string(),
            });
        }

        if total_ms > 0 {
            let mut stdout = io::stdout();
            emit(
                &mut stdout,
                SidecarResponse::Progress {
                    seq: request.seq,
                    processed_ms: total_ms,
                    total_ms,
                },
            );
        }

        Ok(segments)
    }
}

struct DecodeRequest {
    seq: u64,
    sample_rate: u32,
    window_start_ms: i64,
    window_end_ms: i64,
    encoding: String,
    audio_b64: String,
    mode: DecodeMode,
}

fn main() {
    install_logging_hooks();

    let args: Vec<String> = std::env::args().collect();
    match parse_cli_mode(&args) {
        CliMode::RunServer => {}
        CliMode::ShowVersion => {
            println!("{} {}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"));
            return;
        }
        CliMode::DoctorJson => {
            if let Err(err) = print_doctor_json(&mut io::stdout()) {
                eprintln!("{err}");
                std::process::exit(2);
            }
            return;
        }
        CliMode::ShowHelp => {
            println!("{}", usage_text());
            return;
        }
    }

    run_server_loop();
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CliMode {
    RunServer,
    ShowVersion,
    DoctorJson,
    ShowHelp,
}

fn parse_cli_mode(args: &[String]) -> CliMode {
    match args.get(1).map(|value| value.as_str()) {
        None => CliMode::RunServer,
        Some("--version" | "-V") => CliMode::ShowVersion,
        Some("--help" | "-h" | "help") => CliMode::ShowHelp,
        Some("doctor") => {
            if args.iter().any(|arg| arg == "--json") {
                CliMode::DoctorJson
            } else {
                CliMode::ShowHelp
            }
        }
        Some(_) => CliMode::ShowHelp,
    }
}

fn usage_text() -> &'static str {
    "Usage: lepupitre-asr [--version | doctor --json]"
}

fn print_doctor_json(stdout: &mut io::Stdout) -> Result<(), String> {
    let payload = build_doctor_output();
    let json = serde_json::to_string(&payload).map_err(|e| format!("doctor_json: {e}"))?;
    writeln!(stdout, "{json}").map_err(|e| format!("doctor_write: {e}"))?;
    stdout.flush().map_err(|e| format!("doctor_flush: {e}"))?;
    Ok(())
}

fn build_doctor_output() -> SidecarDoctorOutput {
    SidecarDoctorOutput {
        schema_version: SIDECAR_DOCTOR_SCHEMA_VERSION.to_string(),
        sidecar_version: env!("CARGO_PKG_VERSION").to_string(),
        protocol_version: SIDECAR_PROTOCOL_VERSION.to_string(),
        target_triple: target_triple(),
        build_timestamp: option_env!("LEPUPITRE_ASR_BUILD_UNIX_EPOCH")
            .map(|value| format!("unix:{value}")),
        git_commit: option_env!("LEPUPITRE_ASR_GIT_COMMIT").map(|value| value.to_string()),
        capabilities: vec![
            REQUIRED_CAPABILITY_DECODE_F32LE.to_string(),
            REQUIRED_CAPABILITY_PROGRESS_EVENTS.to_string(),
            REQUIRED_CAPABILITY_MODE_SWITCH.to_string(),
        ],
        dependencies: SidecarDoctorDependencies {
            whisper_rs: WHISPER_RS_DEP_VERSION.to_string(),
            whisper_cpp: whisper_rs::WHISPER_CPP_VERSION.to_string(),
            whisper_runtime: whisper_rs::get_whisper_version().to_string(),
            ggml: "bundled_with_whisper_cpp".to_string(),
        },
    }
}

fn target_triple() -> String {
    option_env!("TARGET")
        .map(|value| value.to_string())
        .unwrap_or_else(|| {
            format!(
                "{}-{}-{}",
                std::env::consts::ARCH,
                std::env::consts::OS,
                std::env::consts::FAMILY
            )
        })
}

fn run_server_loop() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();
    let mut state = SidecarState::new();

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
                match state.init(&model_path, sample_rate, &language) {
                    Ok(()) => emit(&mut stdout, SidecarResponse::Ready),
                    Err(message) => {
                        emit(&mut stdout, SidecarResponse::Error { seq: None, message })
                    }
                };
            }
            SidecarRequest::Decode {
                seq,
                sample_rate,
                window_start_ms,
                window_end_ms,
                encoding,
                audio_b64,
                mode,
            } => {
                let mode = parse_mode(mode.as_deref());
                let request = DecodeRequest {
                    seq,
                    sample_rate,
                    window_start_ms,
                    window_end_ms,
                    encoding,
                    audio_b64,
                    mode,
                };
                match state.decode(request) {
                    Ok(segments) => emit(&mut stdout, SidecarResponse::Segments { seq, segments }),
                    Err(message) => emit(
                        &mut stdout,
                        SidecarResponse::Error {
                            seq: Some(seq),
                            message,
                        },
                    ),
                };
            }
            SidecarRequest::Shutdown => {
                break;
            }
        }
    }
}

fn parse_mode(mode: Option<&str>) -> DecodeMode {
    match mode {
        Some("final") => DecodeMode::Final,
        _ => DecodeMode::Live,
    }
}

fn normalize_language(language: &str) -> Option<String> {
    let trimmed = language.trim();
    if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("auto") {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn total_ms(window_start_ms: i64, window_end_ms: i64, samples: &[f32], sample_rate: u32) -> i64 {
    let audio_ms = if sample_rate == 0 {
        0
    } else {
        (samples.len() as i64 * 1000) / sample_rate as i64
    };
    let window_ms = if window_end_ms > window_start_ms {
        window_end_ms - window_start_ms
    } else {
        0
    };
    if window_ms > 0 {
        window_ms
    } else {
        audio_ms
    }
}

fn build_params<'a>(
    mode: DecodeMode,
    language: Option<&'a str>,
    total_ms: i64,
    seq: u64,
) -> FullParams<'a, 'static> {
    let sampling = match mode {
        DecodeMode::Live => SamplingStrategy::Greedy { best_of: 1 },
        DecodeMode::Final => SamplingStrategy::BeamSearch {
            beam_size: 5,
            patience: -1.0,
        },
    };
    let mut params = FullParams::new(sampling);

    params.set_language(language);
    params.set_translate(false);
    params.set_no_context(matches!(mode, DecodeMode::Live));
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_single_segment(false);

    let threads = std::thread::available_parallelism()
        .map(|value| value.get() as i32)
        .unwrap_or(2)
        .clamp(1, 4);
    params.set_n_threads(threads);

    if total_ms > 0 {
        params.set_progress_callback_safe(move |progress: i32| {
            let progress = progress.clamp(0, 100);
            let processed_ms = total_ms * progress as i64 / 100;
            let mut stdout = io::stdout();
            emit(
                &mut stdout,
                SidecarResponse::Progress {
                    seq,
                    processed_ms,
                    total_ms,
                },
            );
        });
    }

    params
}

fn decode_f32_audio(encoded: &str) -> Result<Vec<f32>, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| format!("audio_base64: {e}"))?;
    if bytes.len() % 4 != 0 {
        return Err("audio_bytes_len".to_string());
    }
    let mut samples = Vec::with_capacity(bytes.len() / 4);
    for chunk in bytes.chunks_exact(4) {
        let sample = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
        samples.push(sample);
    }
    Ok(samples)
}

fn emit(stdout: &mut io::Stdout, response: SidecarResponse) {
    if let Ok(payload) = serde_json::to_string(&response) {
        let _ = writeln!(stdout, "{payload}");
        let _ = stdout.flush();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_string()).collect()
    }

    #[test]
    fn cli_mode_defaults_to_server() {
        let parsed = parse_cli_mode(&args(&["lepupitre-asr"]));
        assert_eq!(parsed, CliMode::RunServer);
    }

    #[test]
    fn cli_mode_supports_version_and_doctor_json() {
        assert_eq!(
            parse_cli_mode(&args(&["lepupitre-asr", "--version"])),
            CliMode::ShowVersion
        );
        assert_eq!(
            parse_cli_mode(&args(&["lepupitre-asr", "doctor", "--json"])),
            CliMode::DoctorJson
        );
    }

    #[test]
    fn doctor_output_contains_required_contract_fields() {
        let doctor = build_doctor_output();
        assert_eq!(doctor.schema_version, SIDECAR_DOCTOR_SCHEMA_VERSION);
        assert_eq!(doctor.protocol_version, SIDECAR_PROTOCOL_VERSION);
        assert!(doctor
            .capabilities
            .iter()
            .any(|capability| capability == REQUIRED_CAPABILITY_DECODE_F32LE));
        assert!(!doctor.sidecar_version.trim().is_empty());
        assert!(!doctor.target_triple.trim().is_empty());
    }

    #[test]
    fn decode_audio_round_trip() {
        let samples = [0.0f32, 0.5f32, -0.25f32];
        let mut bytes = Vec::new();
        for sample in samples.iter() {
            bytes.extend_from_slice(&sample.to_le_bytes());
        }
        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
        let decoded = decode_f32_audio(&encoded).expect("decode");
        assert_eq!(decoded.len(), samples.len());
        for (left, right) in decoded.iter().zip(samples.iter()) {
            assert!((left - right).abs() < 1e-6);
        }
    }
}
