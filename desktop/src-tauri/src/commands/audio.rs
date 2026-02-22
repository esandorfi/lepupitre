use base64::Engine;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Sample, SampleFormat};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Manager, State};

use crate::core::artifacts;
use crate::core::asr_live::LiveTranscriptState;
use crate::core::db;
use crate::core::dsp;
use crate::core::models;
use crate::core::recording::{LinearResampler, RingBuffer, WavWriter};
use crate::core::vad::{VadConfig, VadState};

const TARGET_SAMPLE_RATE: u32 = 16000;
const RING_SECONDS: u32 = 30;
const START_TIMEOUT_MS: u64 = 3000;
const STOP_TIMEOUT_MS: u64 = 5000;

const LIVE_WINDOW_MS: i64 = 12_000;
const LIVE_STEP_MS: u64 = 800;
const LIVE_COMMIT_DELAY_MS: i64 = 2_800;
const LIVE_SEGMENT_MS: i64 = 1_200;

const ASR_PARTIAL_EVENT: &str = "asr/partial/v1";
const ASR_COMMIT_EVENT: &str = "asr/commit/v1";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioSaveResult {
    pub path: String,
    pub artifact_id: String,
    pub bytes: u64,
    pub sha256: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStartResult {
    pub recording_id: String,
    pub input_sample_rate: u32,
    pub input_channels: u16,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingStatusResult {
    pub duration_ms: i64,
    pub level: f32,
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
}

struct LiveAsrHandle {
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

#[tauri::command]
pub fn recording_start(
    app: tauri::AppHandle,
    state: State<RecordingManager>,
    profile_id: String,
) -> Result<RecordingStartResult, String> {
    db::ensure_profile_exists(&app, &profile_id)?;

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
        last_error: None,
        is_stopping: false,
        scratch: Vec::with_capacity(4096),
    }));

    let state_clone = state.clone();
    let thread = thread::spawn(move || {
        if let Err(err) = run_recording_thread(draft_path, state_clone, cmd_rx, start_tx) {
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
    let live_thread = thread::spawn(move || {
        run_live_asr(live_app, live_state, live_rx);
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
    })
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
    let _ = session.live.thread.join();
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

fn run_recording_thread(
    draft_path: PathBuf,
    state: Arc<Mutex<RecordingState>>,
    command_rx: mpsc::Receiver<RecordingCommand>,
    start_tx: mpsc::Sender<Result<RecordingStartInfo, String>>,
) -> Result<(), String> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| "recording_no_input".to_string())?;
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
) {
    crate::commands::assert_valid_event_name(ASR_PARTIAL_EVENT);
    crate::commands::assert_valid_event_name(ASR_COMMIT_EVENT);

    let mut seq: u64 = 0;
    let mut speech_index: u64 = 1;
    let mut in_speech = false;
    let mut speech_start_ms: i64 = 0;
    let mut pending_flush = false;
    let mut transcript_state = LiveTranscriptState::new();
    let decoder = MockAsrDecoder::new(LIVE_SEGMENT_MS);
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

struct MockAsrDecoder {
    segment_ms: i64,
}

impl MockAsrDecoder {
    fn new(segment_ms: i64) -> Self {
        Self { segment_ms }
    }

    fn decode(
        &self,
        _window: &[f32],
        window_start_ms: i64,
        window_end_ms: i64,
        speech_index: u64,
        speech_start_ms: i64,
    ) -> Vec<models::TranscriptSegment> {
        let mut segments = Vec::new();
        let mut cursor = speech_start_ms.max(window_start_ms);
        if window_end_ms <= cursor {
            return segments;
        }
        let mut segment_index = 1;
        while cursor < window_end_ms {
            let end = (cursor + self.segment_ms).min(window_end_ms);
            segments.push(models::TranscriptSegment {
                t_start_ms: cursor,
                t_end_ms: end,
                text: format!("(speech {speech_index}.{segment_index})"),
                confidence: None,
            });
            segment_index += 1;
            cursor = end;
        }
        segments
    }
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
pub fn audio_save_wav(
    app: tauri::AppHandle,
    profile_id: String,
    base64: String,
) -> Result<AudioSaveResult, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64.as_bytes())
        .map_err(|e| format!("decode_base64: {e}"))?;

    db::ensure_profile_exists(&app, &profile_id)?;

    let metadata = serde_json::json!({
        "format": "wav",
        "sample_rate_hz": 16000,
        "channels": 1
    });
    let record = artifacts::store_bytes(&app, &profile_id, "audio", "wav", &bytes, &metadata)?;

    Ok(AudioSaveResult {
        path: record.abspath.to_string_lossy().to_string(),
        artifact_id: record.id,
        bytes: record.bytes,
        sha256: record.sha256,
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
