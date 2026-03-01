pub mod asr_live;
pub mod asr_models;
mod diagnostics;
mod downloader;
mod settings;
pub mod transcript;

use crate::kernel::models;
use crate::platform::asr_sidecar;
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tauri::AppHandle;

const SIDECAR_ENV_PATH: &str = "LEPUPITRE_ASR_SIDECAR";
const SIDECAR_MODEL_ENV_PATH: &str = "LEPUPITRE_ASR_MODEL_PATH";
const FINAL_SLOW_DECODE_RATIO: f64 = 1.5;
const MAX_FINAL_SEGMENTS_PER_CHUNK: usize = 200;
const MAX_FINAL_SEGMENTS_TOTAL: usize = 10_000;

pub use diagnostics::{
    build_diagnostics_bundle, AsrDiagnosticsBundle, AsrDiagnosticsModel, AsrDiagnosticsPlatform,
    AsrDiagnosticsSidecar,
};
pub use downloader::download_model_blocking;

pub use settings::{
    normalize_recording_settings, normalize_transcription_settings, AsrRuntimeSettings,
    RecordingAsrRuntimeSettings, RecordingAsrSettingsPayload, TranscriptionAsrSettingsPayload,
};

pub fn decode_wav_mono_16k(bytes: &[u8]) -> Result<(Vec<f32>, i64), String> {
    if bytes.len() < 44 {
        return Err("wav_header".to_string());
    }
    if &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" || &bytes[12..16] != b"fmt " {
        return Err("wav_header".to_string());
    }
    let audio_format = u16::from_le_bytes([bytes[20], bytes[21]]);
    let channels = u16::from_le_bytes([bytes[22], bytes[23]]);
    let sample_rate = u32::from_le_bytes([bytes[24], bytes[25], bytes[26], bytes[27]]);
    let bits_per_sample = u16::from_le_bytes([bytes[34], bytes[35]]);
    if audio_format != 1 || channels != 1 || bits_per_sample != 16 {
        return Err("wav_format".to_string());
    }
    if sample_rate != 16_000 {
        return Err("wav_sample_rate".to_string());
    }
    if &bytes[36..40] != b"data" {
        return Err("wav_data".to_string());
    }
    let data_size = u32::from_le_bytes([bytes[40], bytes[41], bytes[42], bytes[43]]) as usize;
    let data_start = 44;
    let data_end = data_start + data_size;
    if bytes.len() < data_end {
        return Err("wav_data".to_string());
    }
    let mut samples = Vec::with_capacity(data_size / 2);
    for chunk in bytes[data_start..data_end].chunks_exact(2) {
        let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
        samples.push(sample as f32 / 32768.0);
    }
    let duration_ms = ((samples.len() as f64 / sample_rate as f64) * 1000.0).round() as i64;
    Ok((samples, duration_ms))
}

pub fn decode_with_sidecar<F>(
    app: &AppHandle,
    settings: &AsrRuntimeSettings,
    samples: &[f32],
    duration_ms: i64,
    mut on_progress: F,
) -> Result<Vec<models::TranscriptSegment>, String>
where
    F: FnMut(i64, i64),
{
    let sidecar_path = resolve_sidecar_path(app)?;
    let model_path = resolve_model_path(app, &settings.model_id)?;

    let mut decoder =
        asr_sidecar::SidecarDecoder::spawn(&sidecar_path, &model_path, &settings.language)?;

    let total_ms = duration_ms.max(0);
    let chunk_ms: i64 = 12_000;
    let sample_rate = 16_000i64;
    let mut segments = Vec::new();
    let mut cursor_ms = 0i64;

    on_progress(0, total_ms);

    while cursor_ms < total_ms {
        let end_ms = (cursor_ms + chunk_ms).min(total_ms);
        let start_idx = (cursor_ms * sample_rate / 1000).max(0) as usize;
        let end_idx = (end_ms * sample_rate / 1000).max(0) as usize;
        if start_idx >= samples.len() {
            break;
        }
        let end_idx = end_idx.min(samples.len());
        let chunk = &samples[start_idx..end_idx];
        let chunk_ms = (end_ms - cursor_ms).max(0) as f64;
        let decode_start = Instant::now();
        let mut chunk_segments = decoder.decode_window_with_progress(
            chunk,
            cursor_ms,
            end_ms,
            asr_sidecar::DecodeMode::Final,
            |processed_ms: i64, total_chunk_ms: i64| {
                if total_chunk_ms <= 0 {
                    return;
                }
                let clamped = processed_ms.clamp(0, total_chunk_ms);
                let absolute_ms = (cursor_ms + clamped).min(total_ms);
                on_progress(absolute_ms, total_ms);
            },
        )?;
        if chunk_segments.len() > MAX_FINAL_SEGMENTS_PER_CHUNK {
            eprintln!(
                "asr final decode truncated: {} segments in chunk (limit {})",
                chunk_segments.len(),
                MAX_FINAL_SEGMENTS_PER_CHUNK
            );
            chunk_segments.truncate(MAX_FINAL_SEGMENTS_PER_CHUNK);
        }
        if chunk_ms > 0.0 {
            let elapsed_ms = decode_start.elapsed().as_millis() as f64;
            let ratio = elapsed_ms / chunk_ms;
            if ratio > FINAL_SLOW_DECODE_RATIO {
                eprintln!(
                    "asr final decode slow: {:.2}x ({}ms for {}ms window)",
                    ratio,
                    elapsed_ms.round() as i64,
                    chunk_ms.round() as i64
                );
            }
        }
        segments.append(&mut chunk_segments);
        if segments.len() > MAX_FINAL_SEGMENTS_TOTAL {
            eprintln!(
                "asr final decode capped: {} segments total (limit {})",
                segments.len(),
                MAX_FINAL_SEGMENTS_TOTAL
            );
            segments.truncate(MAX_FINAL_SEGMENTS_TOTAL);
            break;
        }
        on_progress(end_ms, total_ms);
        cursor_ms = end_ms;
    }

    Ok(segments)
}

pub trait LiveDecoder {
    fn decode(
        &mut self,
        window: &[f32],
        window_start_ms: i64,
        window_end_ms: i64,
        speech_index: u64,
        speech_start_ms: i64,
    ) -> Vec<models::TranscriptSegment>;
}

pub struct SidecarLiveDecoder {
    decoder: asr_sidecar::SidecarDecoder,
    last_error: Option<String>,
    cooldown_until: Option<Instant>,
    last_slow_log: Option<Instant>,
    slow_decode_ratio: f64,
    decode_backoff_ms: u64,
    slow_log_cooldown_ms: u64,
}

impl SidecarLiveDecoder {
    pub fn new(
        decoder: asr_sidecar::SidecarDecoder,
        slow_decode_ratio: f64,
        decode_backoff_ms: u64,
        slow_log_cooldown_ms: u64,
    ) -> Self {
        Self {
            decoder,
            last_error: None,
            cooldown_until: None,
            last_slow_log: None,
            slow_decode_ratio,
            decode_backoff_ms,
            slow_log_cooldown_ms,
        }
    }
}

impl LiveDecoder for SidecarLiveDecoder {
    fn decode(
        &mut self,
        window: &[f32],
        window_start_ms: i64,
        window_end_ms: i64,
        _speech_index: u64,
        _speech_start_ms: i64,
    ) -> Vec<models::TranscriptSegment> {
        if let Some(deadline) = self.cooldown_until {
            if Instant::now() < deadline {
                return Vec::new();
            }
        }

        let decode_start = Instant::now();
        match self.decoder.decode_window(
            window,
            window_start_ms,
            window_end_ms,
            asr_sidecar::DecodeMode::Live,
        ) {
            Ok(segments) => {
                self.cooldown_until = None;
                let window_ms = (window_end_ms - window_start_ms).max(0) as f64;
                if window_ms > 0.0 {
                    let elapsed_ms = decode_start.elapsed().as_millis() as f64;
                    let ratio = elapsed_ms / window_ms;
                    if ratio > self.slow_decode_ratio {
                        let should_log = self
                            .last_slow_log
                            .map(|last| {
                                last.elapsed().as_millis() as u64 >= self.slow_log_cooldown_ms
                            })
                            .unwrap_or(true);
                        if should_log {
                            eprintln!(
                                "asr live decode slow: {:.2}x ({}ms for {}ms window)",
                                ratio,
                                elapsed_ms.round() as i64,
                                window_ms.round() as i64
                            );
                            self.last_slow_log = Some(Instant::now());
                        }
                    }
                }
                segments
            }
            Err(err) => {
                if self.last_error.as_deref() != Some(&err) {
                    eprintln!("asr sidecar decode error: {err}");
                    self.last_error = Some(err);
                }
                self.cooldown_until =
                    Some(Instant::now() + Duration::from_millis(self.decode_backoff_ms));
                Vec::new()
            }
        }
    }
}

pub struct MockAsrDecoder {
    segment_ms: i64,
}

impl MockAsrDecoder {
    pub fn new(segment_ms: i64) -> Self {
        Self { segment_ms }
    }
}

impl LiveDecoder for MockAsrDecoder {
    fn decode(
        &mut self,
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

pub fn benchmark_live_sidecar(
    decoder: &mut asr_sidecar::SidecarDecoder,
    target_sample_rate: u32,
    auto_bench_window_ms: i64,
    auto_bench_max_ratio: f64,
) -> Result<bool, String> {
    let samples = vec![0.0f32; (target_sample_rate as i64 * auto_bench_window_ms / 1000) as usize];
    let start = Instant::now();
    let _ = decoder.decode_window(
        &samples,
        0,
        auto_bench_window_ms,
        asr_sidecar::DecodeMode::Live,
    )?;
    let elapsed_ms = start.elapsed().as_millis() as f64;
    let allowed_ms = auto_bench_window_ms as f64 * auto_bench_max_ratio;
    Ok(elapsed_ms <= allowed_ms)
}

fn resolve_sidecar_path(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var(SIDECAR_ENV_PATH) {
        let path = PathBuf::from(path);
        if path.exists() {
            return Ok(path);
        }
        return Err("sidecar_missing".to_string());
    }
    asr_sidecar::resolve_sidecar_path(app)
}

fn resolve_model_path(app: &AppHandle, model_id: &str) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var(SIDECAR_MODEL_ENV_PATH) {
        return Ok(PathBuf::from(path));
    }

    let spec = asr_models::model_spec(model_id).ok_or_else(|| "model_unknown".to_string())?;
    let dir = asr_models::models_dir(app)?;
    let path = dir.join(spec.filename);
    if !path.exists() {
        return Err("model_missing".to_string());
    }
    Ok(path)
}

pub fn spawn_sidecar_decoder(
    app: &AppHandle,
    model_id: &str,
    language: &str,
) -> Result<asr_sidecar::SidecarDecoder, String> {
    let sidecar_path = resolve_sidecar_path(app)?;
    let model_path = resolve_model_path(app, model_id)?;
    asr_sidecar::SidecarDecoder::spawn(&sidecar_path, &model_path, language)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_recording_settings_enables_auto_benchmark_for_tiny_auto() {
        let settings = normalize_recording_settings(Some(RecordingAsrSettingsPayload {
            model: Some("tiny".to_string()),
            mode: Some("auto".to_string()),
            language: Some("en".to_string()),
        }));
        assert_eq!(settings.model_id, "tiny");
        assert_eq!(settings.language, "en");
        assert!(settings.live_enabled);
        assert!(settings.auto_benchmark);
    }

    #[test]
    fn normalize_recording_settings_disables_live_for_final_only() {
        let settings = normalize_recording_settings(Some(RecordingAsrSettingsPayload {
            model: Some("base".to_string()),
            mode: Some("final-only".to_string()),
            language: Some("fr".to_string()),
        }));
        assert_eq!(settings.model_id, "base");
        assert_eq!(settings.language, "fr");
        assert!(!settings.live_enabled);
        assert!(!settings.auto_benchmark);
    }
}
