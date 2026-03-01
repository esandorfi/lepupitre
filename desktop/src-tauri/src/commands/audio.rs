use cpal::traits::{DeviceTrait, StreamTrait};
use cpal::{Sample, SampleFormat};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Manager, State};

use crate::core::models;
use crate::domain::asr;
use crate::domain::asr::asr_live::LiveTranscriptState;
use crate::domain::recorder;
use crate::domain::recorder::dsp;
use crate::domain::recorder::recording::{LinearResampler, RingBuffer, WavWriter};
use crate::domain::recorder::vad::{VadConfig, VadState};
use crate::platform::artifacts;
use crate::platform::asr_sidecar;
use crate::platform::db;

const TARGET_SAMPLE_RATE: u32 = 16000;
const RING_SECONDS: u32 = 30;
const START_TIMEOUT_MS: u64 = 3000;
const STOP_TIMEOUT_MS: u64 = 5000;
const NO_SIGNAL_THRESHOLD_MS: u32 = 2500;
const SIGNAL_LEVEL_THRESHOLD: f32 = 0.015;
const CLIPPING_LEVEL_THRESHOLD: f32 = 0.96;
const CLIPPING_RELEASE_LEVEL: f32 = 0.7;
const CLIPPING_REPEATED_FRAMES: u32 = 3;
const CLIPPING_RELEASE_FRAMES: u32 = 8;
const NOISY_ROOM_LEVEL_THRESHOLD: f32 = 0.03;
const NOISY_ROOM_THRESHOLD_MS: u32 = 1800;

const LIVE_WINDOW_MS: i64 = 12_000;
const LIVE_STEP_MS: u64 = 800;
const LIVE_COMMIT_DELAY_MS: i64 = 2_800;
const LIVE_SEGMENT_MS: i64 = 1_200;
const AUTO_BENCH_WINDOW_MS: i64 = 2_000;
const AUTO_BENCH_MAX_RATIO: f64 = 1.2;
const SIDECAR_DECODE_BACKOFF_MS: u64 = 3000;
const ASR_SLOW_DECODE_RATIO: f64 = 1.5;
const ASR_SLOW_LOG_COOLDOWN_MS: u64 = 5000;

const ASR_PARTIAL_EVENT: &str = "asr/partial/v1";
const ASR_COMMIT_EVENT: &str = "asr/commit/v1";
const RECORDING_TELEMETRY_EVENT: &str = "recording/telemetry/v1";
const RECORDING_TELEMETRY_STEP_MS: u64 = 200;
const RECORDING_TELEMETRY_MAX_EVENT_RATE_HZ: f32 = 8.0;
const RECORDING_TELEMETRY_MAX_PAYLOAD_BYTES: usize = 4096;
const RECORDING_WAVEFORM_WINDOW_SAMPLES: usize = TARGET_SAMPLE_RATE as usize;
const RECORDING_WAVEFORM_BINS: usize = 48;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStartResult {
    pub recording_id: String,
    pub input_sample_rate: u32,
    pub input_channels: u16,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingInputDevice {
    pub id: String,
    pub label: String,
    pub is_default: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingTelemetryBudgetResult {
    pub event_interval_ms: u64,
    pub max_event_rate_hz: f32,
    pub max_payload_bytes: usize,
    pub waveform_bins: usize,
    pub estimated_payload_bytes: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStatusResult {
    pub duration_ms: i64,
    pub level: f32,
    pub is_paused: bool,
    pub signal_present: bool,
    pub is_clipping: bool,
    pub quality_hint_key: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStopResult {
    pub path: String,
    pub artifact_id: String,
    pub bytes: u64,
    pub sha256: String,
    pub duration_ms: i64,
}

struct RecordingState {
    writer: Option<WavWriter>,
    resampler: LinearResampler,
    ring: RingBuffer,
    agc: dsp::Agc,
    vad: VadState,
    vad_config: VadConfig,
    last_vad: bool,
    total_samples: u64,
    last_level: f32,
    is_paused: bool,
    silence_ms: u32,
    noisy_room_ms: u32,
    clipping_frames: u32,
    clipping_release_frames: u32,
    clipping_latched: bool,
    signal_present: bool,
    last_error: Option<String>,
    is_stopping: bool,
    scratch: Vec<f32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AsrPartialEvent {
    pub schema_version: String,
    pub text: String,
    pub t0_ms: i64,
    pub t1_ms: i64,
    pub seq: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AsrCommitEvent {
    pub schema_version: String,
    pub segments: Vec<models::TranscriptSegment>,
    pub seq: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RecordingTelemetryEvent {
    pub schema_version: &'static str,
    pub duration_ms: i64,
    pub level: f32,
    pub is_clipping: bool,
    pub signal_present: bool,
    pub quality_hint_key: &'static str,
    pub waveform_peaks: Vec<f32>,
}

struct RecordingStartInfo {
    input_sample_rate: u32,
    input_channels: u16,
}

struct RecordingStopInfo {
    duration_ms: i64,
}

enum RecordingCommand {
    Stop {
        respond_to: mpsc::Sender<Result<RecordingStopInfo, String>>,
    },
}

struct RecordingController {
    recording_id: String,
    profile_id: String,
    draft: artifacts::ArtifactDraft,
    state: Arc<Mutex<RecordingState>>,
    command_tx: mpsc::Sender<RecordingCommand>,
    thread: thread::JoinHandle<()>,
    live: LiveAsrHandle,
    telemetry: RecordingTelemetryHandle,
}

struct LiveAsrHandle {
    stop_tx: mpsc::Sender<()>,
    thread: thread::JoinHandle<()>,
}

struct RecordingTelemetryHandle {
    stop_tx: mpsc::Sender<()>,
    thread: thread::JoinHandle<()>,
}

pub struct RecordingManager {
    session: Mutex<Option<RecordingController>>,
}

impl Default for RecordingManager {
    fn default() -> Self {
        Self {
            session: Mutex::new(None),
        }
    }
}

impl RecordingManager {
    pub fn has_active_session(&self) -> Result<bool, String> {
        let guard = self
            .session
            .lock()
            .map_err(|_| "recording_lock".to_string())?;
        Ok(guard.is_some())
    }
}

#[tauri::command]
pub fn recording_start(
    app: tauri::AppHandle,
    state: State<RecordingManager>,
    profile_id: String,
    asr_settings: Option<asr::RecordingAsrSettingsPayload>,
    input_device_id: Option<String>,
) -> Result<RecordingStartResult, String> {
    db::ensure_profile_exists(&app, &profile_id)?;
    let asr_settings = asr::normalize_recording_settings(asr_settings);

    let mut guard = state.session.lock().map_err(|_| "recording_lock")?;
    if guard.is_some() {
        return Err("recording_active".to_string());
    }

    let draft = artifacts::create_draft(&app, &profile_id, "audio", "wav")?;
    let draft_path = draft.abspath.clone();

    let (cmd_tx, cmd_rx) = mpsc::channel::<RecordingCommand>();
    let (start_tx, start_rx) = mpsc::channel::<Result<RecordingStartInfo, String>>();

    let state = Arc::new(Mutex::new(RecordingState {
        writer: None,
        resampler: LinearResampler::new(TARGET_SAMPLE_RATE, TARGET_SAMPLE_RATE),
        ring: RingBuffer::new((TARGET_SAMPLE_RATE * RING_SECONDS) as usize),
        agc: dsp::Agc::new(0.1, 0.5, 8.0, 0.2),
        vad: VadState::default(),
        vad_config: VadConfig::balanced(),
        last_vad: false,
        total_samples: 0,
        last_level: 0.0,
        is_paused: false,
        silence_ms: 0,
        noisy_room_ms: 0,
        clipping_frames: 0,
        clipping_release_frames: 0,
        clipping_latched: false,
        signal_present: false,
        last_error: None,
        is_stopping: false,
        scratch: Vec::with_capacity(4096),
    }));

    let state_clone = state.clone();
    let selected_input_device_id = input_device_id.clone();
    let thread = thread::spawn(move || {
        if let Err(err) = run_recording_thread(
            draft_path,
            state_clone,
            cmd_rx,
            start_tx,
            selected_input_device_id,
        ) {
            eprintln!("recording thread error: {err}");
        }
    });

    let start_info = start_rx
        .recv_timeout(Duration::from_millis(START_TIMEOUT_MS))
        .map_err(|_| "recording_start_timeout".to_string())??;

    let recording_id = crate::core::ids::new_id("rec");

    let (live_tx, live_rx) = mpsc::channel::<()>();
    let live_state = state.clone();
    let live_app = app.clone();
    let live_settings = asr_settings.clone();
    let live_thread = thread::spawn(move || {
        run_live_asr(live_app, live_state, live_rx, live_settings);
    });

    let (telemetry_tx, telemetry_rx) = mpsc::channel::<()>();
    let telemetry_state = state.clone();
    let telemetry_app = app.clone();
    let telemetry_thread = thread::spawn(move || {
        run_recording_telemetry(telemetry_app, telemetry_state, telemetry_rx);
    });

    *guard = Some(RecordingController {
        recording_id: recording_id.clone(),
        profile_id: profile_id.clone(),
        draft,
        state,
        command_tx: cmd_tx,
        thread,
        live: LiveAsrHandle {
            stop_tx: live_tx,
            thread: live_thread,
        },
        telemetry: RecordingTelemetryHandle {
            stop_tx: telemetry_tx,
            thread: telemetry_thread,
        },
    });

    Ok(RecordingStartResult {
        recording_id,
        input_sample_rate: start_info.input_sample_rate,
        input_channels: start_info.input_channels,
    })
}

#[tauri::command]
pub fn recording_status(
    state: State<RecordingManager>,
    recording_id: String,
) -> Result<RecordingStatusResult, String> {
    let guard = state.session.lock().map_err(|_| "recording_lock")?;
    let session = guard
        .as_ref()
        .ok_or_else(|| "recording_missing".to_string())?;
    if session.recording_id != recording_id {
        return Err("recording_id_mismatch".to_string());
    }

    let state = session.state.lock().map_err(|_| "recording_lock")?;
    let duration_ms =
        (state.total_samples as f64 / TARGET_SAMPLE_RATE as f64 * 1000.0).round() as i64;

    Ok(RecordingStatusResult {
        duration_ms,
        level: state.last_level,
        is_paused: state.is_paused,
        signal_present: state.signal_present,
        is_clipping: state.clipping_latched,
        quality_hint_key: quality_hint_key(&state).to_string(),
    })
}

#[tauri::command]
pub fn recording_pause(state: State<RecordingManager>, recording_id: String) -> Result<(), String> {
    let guard = state.session.lock().map_err(|_| "recording_lock")?;
    let session = guard
        .as_ref()
        .ok_or_else(|| "recording_missing".to_string())?;
    if session.recording_id != recording_id {
        return Err("recording_id_mismatch".to_string());
    }

    let mut recording_state = session.state.lock().map_err(|_| "recording_lock")?;
    if recording_state.is_paused {
        return Ok(());
    }
    recording_state.is_paused = true;
    recording_state.last_level = 0.0;
    recording_state.last_vad = false;
    Ok(())
}

#[tauri::command]
pub fn recording_resume(
    state: State<RecordingManager>,
    recording_id: String,
) -> Result<(), String> {
    let guard = state.session.lock().map_err(|_| "recording_lock")?;
    let session = guard
        .as_ref()
        .ok_or_else(|| "recording_missing".to_string())?;
    if session.recording_id != recording_id {
        return Err("recording_id_mismatch".to_string());
    }

    let mut recording_state = session.state.lock().map_err(|_| "recording_lock")?;
    if !recording_state.is_paused {
        return Ok(());
    }
    recording_state.is_paused = false;
    recording_state.last_level = 0.0;
    recording_state.last_vad = false;
    Ok(())
}

#[tauri::command]
pub fn recording_stop(
    app: tauri::AppHandle,
    state: State<RecordingManager>,
    profile_id: String,
    recording_id: String,
) -> Result<RecordingStopResult, String> {
    db::ensure_profile_exists(&app, &profile_id)?;

    let session = {
        let mut guard = state.session.lock().map_err(|_| "recording_lock")?;
        let session = guard
            .take()
            .ok_or_else(|| "recording_missing".to_string())?;
        if session.recording_id != recording_id {
            *guard = Some(session);
            return Err("recording_id_mismatch".to_string());
        }
        session
    };

    if session.profile_id != profile_id {
        return Err("recording_profile_mismatch".to_string());
    }

    let (reply_tx, reply_rx) = mpsc::channel::<Result<RecordingStopInfo, String>>();
    session
        .command_tx
        .send(RecordingCommand::Stop {
            respond_to: reply_tx,
        })
        .map_err(|_| "recording_stop_send".to_string())?;

    let stop_info = reply_rx
        .recv_timeout(Duration::from_millis(STOP_TIMEOUT_MS))
        .map_err(|_| "recording_stop_timeout".to_string())??;

    let _ = session.live.stop_tx.send(());
    let _ = session.telemetry.stop_tx.send(());
    let _ = session.live.thread.join();
    let _ = session.telemetry.thread.join();
    let _ = session.thread.join();

    let metadata = serde_json::json!({
        "format": "wav",
        "sample_rate_hz": TARGET_SAMPLE_RATE,
        "channels": 1
    });

    let record = artifacts::finalize_draft(&app, &profile_id, session.draft, &metadata)?;

    Ok(RecordingStopResult {
        path: record.abspath.to_string_lossy().to_string(),
        artifact_id: record.id,
        bytes: record.bytes,
        sha256: record.sha256,
        duration_ms: stop_info.duration_ms,
    })
}

#[tauri::command]
pub fn recording_input_devices() -> Result<Vec<RecordingInputDevice>, String> {
    Ok(recorder::list_input_devices()?
        .into_iter()
        .map(|device| RecordingInputDevice {
            id: device.id,
            label: device.label,
            is_default: device.is_default,
        })
        .collect())
}

#[tauri::command]
pub fn recording_telemetry_budget() -> RecordingTelemetryBudgetResult {
    RecordingTelemetryBudgetResult {
        event_interval_ms: RECORDING_TELEMETRY_STEP_MS,
        max_event_rate_hz: RECORDING_TELEMETRY_MAX_EVENT_RATE_HZ,
        max_payload_bytes: RECORDING_TELEMETRY_MAX_PAYLOAD_BYTES,
        waveform_bins: RECORDING_WAVEFORM_BINS,
        estimated_payload_bytes: estimate_recording_telemetry_payload_bytes(
            RECORDING_WAVEFORM_BINS,
        ),
    }
}

fn run_recording_thread(
    draft_path: PathBuf,
    state: Arc<Mutex<RecordingState>>,
    command_rx: mpsc::Receiver<RecordingCommand>,
    start_tx: mpsc::Sender<Result<RecordingStartInfo, String>>,
    selected_input_device_id: Option<String>,
) -> Result<(), String> {
    let device = recorder::resolve_input_device(selected_input_device_id.as_deref())?;
    let config = device
        .default_input_config()
        .map_err(|e| format!("recording_config: {e}"))?;
    let sample_format = config.sample_format();
    let stream_config: cpal::StreamConfig = config.into();
    let input_sample_rate = stream_config.sample_rate.0;
    let input_channels = stream_config.channels;

    let writer = WavWriter::create(&draft_path, TARGET_SAMPLE_RATE, 1)?;

    {
        let mut guard = state.lock().map_err(|_| "recording_lock")?;
        guard.writer = Some(writer);
        guard.resampler = LinearResampler::new(input_sample_rate, TARGET_SAMPLE_RATE);
    }

    let state_clone = state.clone();
    let err_fn = |err| eprintln!("recording stream error: {err}");

    let stream = match sample_format {
        SampleFormat::F32 => device
            .build_input_stream(
                &stream_config,
                move |data: &[f32], _| handle_input(&state_clone, data, input_channels),
                err_fn,
                None,
            )
            .map_err(|e| format!("recording_stream: {e}"))?,
        SampleFormat::I16 => device
            .build_input_stream(
                &stream_config,
                move |data: &[i16], _| handle_input(&state_clone, data, input_channels),
                err_fn,
                None,
            )
            .map_err(|e| format!("recording_stream: {e}"))?,
        SampleFormat::U16 => device
            .build_input_stream(
                &stream_config,
                move |data: &[u16], _| handle_input(&state_clone, data, input_channels),
                err_fn,
                None,
            )
            .map_err(|e| format!("recording_stream: {e}"))?,
        _ => return Err("recording_format".to_string()),
    };

    stream.play().map_err(|e| format!("recording_start: {e}"))?;

    let _ = start_tx.send(Ok(RecordingStartInfo {
        input_sample_rate,
        input_channels,
    }));

    match command_rx.recv() {
        Ok(RecordingCommand::Stop { respond_to }) => {
            let mut error = None;
            let duration_ms;

            {
                let mut guard = state.lock().map_err(|_| "recording_lock")?;
                guard.is_stopping = true;
                duration_ms = (guard.total_samples as f64 / TARGET_SAMPLE_RATE as f64 * 1000.0)
                    .round() as i64;
                if let Some(err) = guard.last_error.clone() {
                    error = Some(err);
                }
            }

            drop(stream);

            let writer = {
                let mut guard = state.lock().map_err(|_| "recording_lock")?;
                guard.writer.take()
            };

            if let Some(err) = error {
                let _ = respond_to.send(Err(err));
                return Ok(());
            }

            let writer = match writer {
                Some(writer) => writer,
                None => {
                    let _ = respond_to.send(Err("recording_writer_missing".to_string()));
                    return Ok(());
                }
            };

            if let Err(err) = writer.finalize() {
                let _ = respond_to.send(Err(err));
                return Ok(());
            }

            let _ = respond_to.send(Ok(RecordingStopInfo { duration_ms }));
        }
        Err(_) => return Ok(()),
    }

    Ok(())
}

fn run_live_asr(
    app: tauri::AppHandle,
    state: Arc<Mutex<RecordingState>>,
    stop_rx: mpsc::Receiver<()>,
    settings: asr::RecordingAsrRuntimeSettings,
) {
    crate::commands::assert_valid_event_name(ASR_PARTIAL_EVENT);
    crate::commands::assert_valid_event_name(ASR_COMMIT_EVENT);

    let mut settings = settings;
    let mut sidecar_decoder: Option<asr_sidecar::SidecarDecoder> = None;
    if settings.auto_benchmark {
        match asr::spawn_sidecar_decoder(&app, &settings.model_id, &settings.language) {
            Ok(mut decoder) => match asr::benchmark_live_sidecar(
                &mut decoder,
                TARGET_SAMPLE_RATE,
                AUTO_BENCH_WINDOW_MS,
                AUTO_BENCH_MAX_RATIO,
            ) {
                Ok(true) => {
                    sidecar_decoder = Some(decoder);
                }
                Ok(false) => {
                    eprintln!("asr auto benchmark: disabling live");
                    settings.live_enabled = false;
                }
                Err(err) => {
                    eprintln!("asr auto benchmark failed: {err}");
                    settings.live_enabled = false;
                }
            },
            Err(err) => {
                eprintln!("asr auto benchmark sidecar missing: {err}");
                settings.live_enabled = false;
            }
        }
    }

    if !settings.live_enabled {
        let _ = stop_rx.recv();
        return;
    }

    let mut seq: u64 = 0;
    let mut speech_index: u64 = 1;
    let mut in_speech = false;
    let mut speech_start_ms: i64 = 0;
    let mut pending_flush = false;
    let mut transcript_state = LiveTranscriptState::new();
    let mut decoder: Box<dyn asr::LiveDecoder> = if let Some(sidecar) = sidecar_decoder {
        Box::new(asr::SidecarLiveDecoder::new(
            sidecar,
            ASR_SLOW_DECODE_RATIO,
            SIDECAR_DECODE_BACKOFF_MS,
            ASR_SLOW_LOG_COOLDOWN_MS,
        ))
    } else {
        match asr::spawn_sidecar_decoder(&app, &settings.model_id, &settings.language) {
            Ok(sidecar) => Box::new(asr::SidecarLiveDecoder::new(
                sidecar,
                ASR_SLOW_DECODE_RATIO,
                SIDECAR_DECODE_BACKOFF_MS,
                ASR_SLOW_LOG_COOLDOWN_MS,
            )),
            Err(err) => {
                eprintln!("asr sidecar unavailable: {err}");
                Box::new(asr::MockAsrDecoder::new(LIVE_SEGMENT_MS))
            }
        }
    };
    let window_samples = (TARGET_SAMPLE_RATE as i64 * LIVE_WINDOW_MS / 1000) as usize;

    loop {
        if stop_rx.try_recv().is_ok() {
            if in_speech || pending_flush {
                let now_ms = current_recording_ms(&state);
                let window = snapshot_window(&state, window_samples);
                let window_start_ms =
                    now_ms - (window.len() as i64 * 1000 / TARGET_SAMPLE_RATE as i64);
                let segments = decoder.decode(
                    &window,
                    window_start_ms,
                    now_ms,
                    speech_index,
                    speech_start_ms,
                );
                emit_live_updates(&app, &mut seq, &mut transcript_state, &segments, now_ms);
            }
            break;
        }

        thread::sleep(Duration::from_millis(LIVE_STEP_MS));

        let (last_vad, total_samples) = match state.lock() {
            Ok(guard) => (guard.last_vad, guard.total_samples),
            Err(_) => continue,
        };
        let now_ms = (total_samples as f64 / TARGET_SAMPLE_RATE as f64 * 1000.0).round() as i64;

        if last_vad && !in_speech {
            in_speech = true;
            speech_start_ms = now_ms;
        } else if !last_vad && in_speech {
            in_speech = false;
            pending_flush = true;
        }

        if !in_speech && !pending_flush {
            continue;
        }

        let window = snapshot_window(&state, window_samples);
        let window_start_ms = now_ms - (window.len() as i64 * 1000 / TARGET_SAMPLE_RATE as i64);
        let segments = decoder.decode(
            &window,
            window_start_ms,
            now_ms,
            speech_index,
            speech_start_ms,
        );
        let commit_cutoff = if pending_flush {
            now_ms
        } else {
            now_ms - LIVE_COMMIT_DELAY_MS
        };

        emit_live_updates(
            &app,
            &mut seq,
            &mut transcript_state,
            &segments,
            commit_cutoff,
        );

        if pending_flush {
            pending_flush = false;
            speech_index += 1;
        }
    }
}

fn run_recording_telemetry(
    app: tauri::AppHandle,
    state: Arc<Mutex<RecordingState>>,
    stop_rx: mpsc::Receiver<()>,
) {
    crate::commands::assert_valid_event_name(RECORDING_TELEMETRY_EVENT);

    loop {
        if stop_rx.try_recv().is_ok() {
            break;
        }

        let payload = match state.lock() {
            Ok(guard) => {
                let waveform_samples = guard.ring.snapshot_last(RECORDING_WAVEFORM_WINDOW_SAMPLES);
                RecordingTelemetryEvent {
                    schema_version: "1.0.0",
                    duration_ms: (guard.total_samples as f64 / TARGET_SAMPLE_RATE as f64 * 1000.0)
                        .round() as i64,
                    level: guard.last_level,
                    is_clipping: guard.clipping_latched,
                    signal_present: guard.signal_present,
                    quality_hint_key: quality_hint_key(&guard),
                    waveform_peaks: build_waveform_peaks(
                        &waveform_samples,
                        RECORDING_WAVEFORM_BINS,
                    ),
                }
            }
            Err(_) => break,
        };

        let _ = app.emit(RECORDING_TELEMETRY_EVENT, payload);
        thread::sleep(Duration::from_millis(RECORDING_TELEMETRY_STEP_MS));
    }
}

fn estimate_recording_telemetry_payload_bytes(waveform_bins: usize) -> usize {
    let payload = RecordingTelemetryEvent {
        schema_version: "1.0.0",
        duration_ms: i64::MAX,
        level: 1.0,
        is_clipping: true,
        signal_present: true,
        quality_hint_key: "noisy_room",
        waveform_peaks: vec![1.0; waveform_bins],
    };
    serde_json::to_vec(&payload)
        .map(|encoded| encoded.len())
        .unwrap_or(usize::MAX)
}

fn current_recording_ms(state: &Arc<Mutex<RecordingState>>) -> i64 {
    match state.lock() {
        Ok(guard) => {
            (guard.total_samples as f64 / TARGET_SAMPLE_RATE as f64 * 1000.0).round() as i64
        }
        Err(_) => 0,
    }
}

fn snapshot_window(state: &Arc<Mutex<RecordingState>>, window_samples: usize) -> Vec<f32> {
    match state.lock() {
        Ok(guard) => guard.ring.snapshot_last(window_samples),
        Err(_) => Vec::new(),
    }
}

fn emit_live_updates(
    app: &tauri::AppHandle,
    seq: &mut u64,
    transcript_state: &mut LiveTranscriptState,
    segments: &[models::TranscriptSegment],
    commit_cutoff_ms: i64,
) {
    let update = transcript_state.apply_decode(segments, commit_cutoff_ms);
    if !update.committed.is_empty() {
        *seq += 1;
        let _ = app.emit(
            ASR_COMMIT_EVENT,
            AsrCommitEvent {
                schema_version: "1.0.0".to_string(),
                segments: update.committed,
                seq: *seq,
            },
        );
    }
    if let Some(partial) = update.partial {
        *seq += 1;
        let _ = app.emit(
            ASR_PARTIAL_EVENT,
            AsrPartialEvent {
                schema_version: "1.0.0".to_string(),
                text: partial.text,
                t0_ms: partial.t0_ms,
                t1_ms: partial.t1_ms,
                seq: *seq,
            },
        );
    }
}

fn quality_hint_key(state: &RecordingState) -> &'static str {
    if state.silence_ms >= NO_SIGNAL_THRESHOLD_MS {
        return "no_signal";
    }
    if state.clipping_latched {
        return "too_loud";
    }
    if state.noisy_room_ms >= NOISY_ROOM_THRESHOLD_MS {
        return "noisy_room";
    }
    if state.last_level < SIGNAL_LEVEL_THRESHOLD {
        return "too_quiet";
    }
    "good_level"
}

fn build_waveform_peaks(samples: &[f32], bins: usize) -> Vec<f32> {
    if bins == 0 {
        return Vec::new();
    }
    if samples.is_empty() {
        return vec![0.0; bins];
    }

    let chunk_size = samples.len().div_ceil(bins).max(1);
    let mut peaks = Vec::with_capacity(bins);
    let mut cursor = 0usize;
    for _ in 0..bins {
        let end = (cursor + chunk_size).min(samples.len());
        if cursor >= samples.len() || cursor >= end {
            peaks.push(0.0);
            continue;
        }
        let peak = samples[cursor..end]
            .iter()
            .fold(0.0_f32, |acc, sample| acc.max(sample.abs()))
            .clamp(0.0, 1.0);
        peaks.push(peak);
        cursor = end;
    }
    peaks
}

fn handle_input<T>(state: &Arc<Mutex<RecordingState>>, data: &[T], channels: u16)
where
    T: Sample,
    f32: cpal::FromSample<T>,
{
    let mut guard = match state.lock() {
        Ok(lock) => lock,
        Err(_) => return,
    };

    if guard.is_stopping {
        return;
    }
    if guard.is_paused {
        guard.last_level = 0.0;
        guard.last_vad = false;
        guard.signal_present = false;
        return;
    }

    let mut scratch = std::mem::take(&mut guard.scratch);
    scratch.clear();
    if channels <= 1 {
        scratch.extend(data.iter().map(|sample| sample.to_sample::<f32>()));
    } else {
        let channels = channels as usize;
        for frame in data.chunks(channels) {
            let mut sum = 0.0f32;
            for sample in frame {
                sum += sample.to_sample::<f32>();
            }
            scratch.push(sum / channels as f32);
        }
    }

    guard.last_level = dsp::rms(&scratch);

    let resampled = guard.resampler.process(&scratch);
    guard.scratch = scratch;
    if resampled.is_empty() {
        return;
    }

    guard.total_samples += resampled.len() as u64;

    let mut processed = resampled.clone();
    guard.agc.process(&mut processed);

    let frame_ms = ((processed.len() as f32 / TARGET_SAMPLE_RATE as f32) * 1000.0).round() as u32;
    if frame_ms > 0 {
        let config = VadConfig {
            speech_start_ms: guard.vad_config.speech_start_ms,
            speech_end_ms: guard.vad_config.speech_end_ms,
            energy_threshold: guard.vad_config.energy_threshold,
        };
        let decision = guard.vad.update_from_samples(&processed, frame_ms, &config);
        guard.last_vad = decision.in_speech;

        let signal_present = decision.in_speech || guard.last_level >= SIGNAL_LEVEL_THRESHOLD;
        guard.signal_present = signal_present;
        if signal_present {
            guard.silence_ms = 0;
        } else {
            guard.silence_ms = guard.silence_ms.saturating_add(frame_ms);
        }

        let noisy_room = !decision.in_speech && guard.last_level >= NOISY_ROOM_LEVEL_THRESHOLD;
        if noisy_room {
            guard.noisy_room_ms = guard.noisy_room_ms.saturating_add(frame_ms);
        } else {
            guard.noisy_room_ms = 0;
        }

        if guard.last_level >= CLIPPING_LEVEL_THRESHOLD {
            guard.clipping_frames = guard.clipping_frames.saturating_add(1);
            guard.clipping_release_frames = 0;
            if guard.clipping_frames >= CLIPPING_REPEATED_FRAMES {
                guard.clipping_latched = true;
            }
        } else if guard.clipping_latched {
            if guard.last_level <= CLIPPING_RELEASE_LEVEL {
                guard.clipping_release_frames = guard.clipping_release_frames.saturating_add(1);
                if guard.clipping_release_frames >= CLIPPING_RELEASE_FRAMES {
                    guard.clipping_latched = false;
                    guard.clipping_frames = 0;
                    guard.clipping_release_frames = 0;
                }
            } else {
                guard.clipping_release_frames = 0;
            }
        } else {
            guard.clipping_frames = 0;
        }
    }
    guard.ring.push(&processed);

    if let Some(writer) = guard.writer.as_mut() {
        if let Err(err) = writer.write_samples(&resampled) {
            guard.last_error = Some(err);
            guard.is_stopping = true;
        }
    }
}

#[tauri::command]
pub fn audio_trim_wav(
    app: tauri::AppHandle,
    profile_id: String,
    audio_artifact_id: String,
    start_ms: i64,
    end_ms: i64,
) -> Result<RecordingStopResult, String> {
    db::ensure_profile_exists(&app, &profile_id)?;

    let artifact = artifacts::get_artifact(&app, &profile_id, &audio_artifact_id)?;
    if artifact.artifact_type != "audio" {
        return Err("artifact_not_audio".to_string());
    }

    let profile_dir = db::profile_dir(&app, &profile_id)?;
    let source_path = profile_dir.join(&artifact.relpath);
    let source_bytes = std::fs::read(&source_path).map_err(|e| format!("audio_read: {e}"))?;
    let source_samples = recorder::decode_wav_pcm16_mono_16k(&source_bytes)?;
    let (start_idx, end_idx, start_ms, end_ms) = recorder::resolve_trim_sample_range(
        source_samples.len(),
        start_ms,
        end_ms,
        TARGET_SAMPLE_RATE,
    )?;
    let trimmed_samples = &source_samples[start_idx..end_idx];
    let trimmed_bytes = recorder::encode_wav_pcm16_mono(TARGET_SAMPLE_RATE, 1, trimmed_samples)?;
    let duration_ms =
        recorder::duration_ms_from_sample_count(trimmed_samples.len(), TARGET_SAMPLE_RATE);

    let metadata = serde_json::json!({
        "format": "wav",
        "sample_rate_hz": TARGET_SAMPLE_RATE,
        "channels": 1,
        "source_audio_artifact_id": audio_artifact_id,
        "trim_kind": "range_ms",
        "trim_start_ms": start_ms,
        "trim_end_ms": end_ms,
    });
    let record =
        artifacts::store_bytes(&app, &profile_id, "audio", "wav", &trimmed_bytes, &metadata)?;

    Ok(RecordingStopResult {
        path: record.abspath.to_string_lossy().to_string(),
        artifact_id: record.id,
        bytes: record.bytes,
        sha256: record.sha256,
        duration_ms,
    })
}

#[tauri::command]
pub fn audio_reveal_wav(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let app_data_dir = app_data_dir
        .canonicalize()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    let requested = PathBuf::from(path)
        .canonicalize()
        .map_err(|e| format!("path: {e}"))?;

    if !requested.starts_with(&app_data_dir) {
        return Err("path_not_allowed".to_string());
    }

    reveal_in_file_manager(&requested)?;
    Ok(())
}

fn reveal_in_file_manager(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .arg("-R")
            .arg(path)
            .status()
            .map_err(|e| format!("open: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            Err("open_failed".to_string())
        }
    }

    #[cfg(target_os = "windows")]
    {
        let arg = format!("/select,{}", path.display());
        let status = Command::new("explorer")
            .arg(arg)
            .status()
            .map_err(|e| format!("explorer: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            Err("explorer_failed".to_string())
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let parent_dir = path
            .parent()
            .ok_or_else(|| "path_missing_parent".to_string())?;
        let status = Command::new("xdg-open")
            .arg(parent_dir)
            .status()
            .map_err(|e| format!("xdg-open: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            Err("xdg_open_failed".to_string())
        }
    }
}

#[cfg(test)]
mod audio_tests {
    use super::*;

    fn base_state() -> RecordingState {
        RecordingState {
            writer: None,
            resampler: LinearResampler::new(TARGET_SAMPLE_RATE, TARGET_SAMPLE_RATE),
            ring: RingBuffer::new(256),
            agc: dsp::Agc::new(0.1, 0.5, 8.0, 0.2),
            vad: VadState::default(),
            vad_config: VadConfig::balanced(),
            last_vad: false,
            total_samples: 0,
            last_level: SIGNAL_LEVEL_THRESHOLD + 0.01,
            is_paused: false,
            silence_ms: 0,
            noisy_room_ms: 0,
            clipping_frames: 0,
            clipping_release_frames: 0,
            clipping_latched: false,
            signal_present: true,
            last_error: None,
            is_stopping: false,
            scratch: Vec::new(),
        }
    }

    #[test]
    fn quality_hint_prioritizes_no_signal() {
        let mut state = base_state();
        state.silence_ms = NO_SIGNAL_THRESHOLD_MS;
        state.clipping_latched = true;
        state.noisy_room_ms = NOISY_ROOM_THRESHOLD_MS;
        state.last_level = 0.0;

        assert_eq!(quality_hint_key(&state), "no_signal");
    }

    #[test]
    fn quality_hint_prioritizes_clipping_after_signal_presence() {
        let mut state = base_state();
        state.clipping_latched = true;
        state.noisy_room_ms = NOISY_ROOM_THRESHOLD_MS;
        state.last_level = 0.0;

        assert_eq!(quality_hint_key(&state), "too_loud");
    }

    #[test]
    fn quality_hint_marks_noisy_room_before_quiet() {
        let mut state = base_state();
        state.noisy_room_ms = NOISY_ROOM_THRESHOLD_MS;
        state.last_level = 0.0;

        assert_eq!(quality_hint_key(&state), "noisy_room");
    }

    #[test]
    fn quality_hint_marks_too_quiet_when_below_threshold() {
        let mut state = base_state();
        state.last_level = SIGNAL_LEVEL_THRESHOLD - 0.001;

        assert_eq!(quality_hint_key(&state), "too_quiet");
    }

    #[test]
    fn quality_hint_marks_good_level_when_nominal() {
        let state = base_state();

        assert_eq!(quality_hint_key(&state), "good_level");
    }

    #[test]
    fn build_waveform_peaks_returns_fixed_bins_for_empty_input() {
        let peaks = build_waveform_peaks(&[], 4);
        assert_eq!(peaks, vec![0.0, 0.0, 0.0, 0.0]);
    }

    #[test]
    fn build_waveform_peaks_tracks_peak_values_per_bucket() {
        let peaks = build_waveform_peaks(&[0.1, -0.2, 0.7, -0.9, 0.4, 0.3], 3);
        assert_eq!(peaks.len(), 3);
        assert!((peaks[0] - 0.2).abs() < 1e-6);
        assert!((peaks[1] - 0.9).abs() < 1e-6);
        assert!((peaks[2] - 0.4).abs() < 1e-6);
    }

    #[test]
    fn telemetry_budget_stays_within_declared_limits() {
        let budget = recording_telemetry_budget();
        let computed_rate = 1000.0 / budget.event_interval_ms as f32;
        assert!(computed_rate <= budget.max_event_rate_hz);
        assert!(budget.estimated_payload_bytes <= budget.max_payload_bytes);
    }
}
