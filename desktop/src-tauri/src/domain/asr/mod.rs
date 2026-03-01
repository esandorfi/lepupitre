pub mod asr_live;
pub mod asr_models;
mod diagnostics;
mod downloader;
mod live_decoder;
mod settings;
pub mod transcript;

use crate::kernel::models;
use crate::platform::asr_sidecar;
use std::path::PathBuf;
use std::time::Instant;
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
pub use live_decoder::{benchmark_live_sidecar, LiveDecoder, MockAsrDecoder, SidecarLiveDecoder};

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
