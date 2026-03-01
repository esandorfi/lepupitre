use cpal::traits::{DeviceTrait, HostTrait};

#[derive(Debug, Clone)]
pub struct RecordingInputDeviceInfo {
    pub id: String,
    pub label: String,
    pub is_default: bool,
}

pub fn list_input_devices() -> Result<Vec<RecordingInputDeviceInfo>, String> {
    let host = cpal::default_host();
    let default_name = host
        .default_input_device()
        .and_then(|device| device.name().ok());
    let devices = host
        .input_devices()
        .map_err(|e| format!("recording_input_devices: {e}"))?;

    let mut listed = Vec::new();
    for (index, device) in devices.enumerate() {
        let name = device
            .name()
            .unwrap_or_else(|_| format!("Microphone {}", index + 1));
        listed.push(RecordingInputDeviceInfo {
            id: build_recording_input_device_id(index, &name),
            label: name.clone(),
            is_default: default_name.as_deref() == Some(name.as_str()),
        });
    }
    Ok(listed)
}

pub fn resolve_input_device(selected_id: Option<&str>) -> Result<cpal::Device, String> {
    let host = cpal::default_host();
    if let Some(selected_id) = selected_id {
        let devices = host
            .input_devices()
            .map_err(|e| format!("recording_input_devices: {e}"))?;
        for (index, device) in devices.enumerate() {
            let name = device
                .name()
                .unwrap_or_else(|_| format!("Microphone {}", index + 1));
            if build_recording_input_device_id(index, &name) == selected_id {
                return Ok(device);
            }
        }
    }

    host.default_input_device()
        .ok_or_else(|| "recording_no_input".to_string())
}

pub fn build_recording_input_device_id(index: usize, name: &str) -> String {
    format!("mic-{}-{}", index, name.replace(' ', "_"))
}

pub fn decode_wav_pcm16_mono_16k(bytes: &[u8]) -> Result<Vec<i16>, String> {
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
        samples.push(i16::from_le_bytes([chunk[0], chunk[1]]));
    }
    Ok(samples)
}

pub fn encode_wav_pcm16_mono(
    sample_rate: u32,
    channels: u16,
    samples: &[i16],
) -> Result<Vec<u8>, String> {
    let data_bytes = samples
        .len()
        .checked_mul(2)
        .ok_or_else(|| "wav_data_size".to_string())?;
    let data_bytes = u32::try_from(data_bytes).map_err(|_| "wav_data_size".to_string())?;
    let riff_size = 36u32
        .checked_add(data_bytes)
        .ok_or_else(|| "wav_data_size".to_string())?;
    let byte_rate = sample_rate * channels as u32 * 2;
    let block_align = channels * 2;

    let mut out = Vec::with_capacity(44 + samples.len() * 2);
    out.extend_from_slice(b"RIFF");
    out.extend_from_slice(&riff_size.to_le_bytes());
    out.extend_from_slice(b"WAVE");
    out.extend_from_slice(b"fmt ");
    out.extend_from_slice(&16u32.to_le_bytes());
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&channels.to_le_bytes());
    out.extend_from_slice(&sample_rate.to_le_bytes());
    out.extend_from_slice(&byte_rate.to_le_bytes());
    out.extend_from_slice(&block_align.to_le_bytes());
    out.extend_from_slice(&16u16.to_le_bytes());
    out.extend_from_slice(b"data");
    out.extend_from_slice(&data_bytes.to_le_bytes());
    for sample in samples {
        out.extend_from_slice(&sample.to_le_bytes());
    }
    Ok(out)
}

pub fn resolve_trim_sample_range(
    sample_count: usize,
    start_ms: i64,
    end_ms: i64,
    sample_rate: u32,
) -> Result<(usize, usize, i64, i64), String> {
    let total_duration_ms = duration_ms_from_sample_count(sample_count, sample_rate);
    if total_duration_ms <= 0 {
        return Err("trim_source_empty".to_string());
    }

    let clamped_start_ms = start_ms.clamp(0, total_duration_ms);
    let clamped_end_ms = end_ms.clamp(0, total_duration_ms);
    if clamped_end_ms <= clamped_start_ms {
        return Err("trim_range_invalid".to_string());
    }

    let start_idx = ms_to_sample_index_floor(clamped_start_ms, sample_rate).min(sample_count);
    let end_idx = ms_to_sample_index_ceil(clamped_end_ms, sample_rate).min(sample_count);
    if end_idx <= start_idx {
        return Err("trim_too_short".to_string());
    }

    Ok((start_idx, end_idx, clamped_start_ms, clamped_end_ms))
}

pub fn duration_ms_from_sample_count(sample_count: usize, sample_rate: u32) -> i64 {
    ((sample_count as f64 / sample_rate as f64) * 1000.0).round() as i64
}

fn ms_to_sample_index_floor(ms: i64, sample_rate: u32) -> usize {
    if ms <= 0 {
        return 0;
    }
    let ms = ms as u128;
    let sample_rate = sample_rate as u128;
    ((ms * sample_rate) / 1000) as usize
}

fn ms_to_sample_index_ceil(ms: i64, sample_rate: u32) -> usize {
    if ms <= 0 {
        return 0;
    }
    let ms = ms as u128;
    let sample_rate = sample_rate as u128;
    ((ms * sample_rate).div_ceil(1000)) as usize
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn fixture_bytes() -> Vec<u8> {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("sine_16k_mono.wav");
        std::fs::read(path).expect("fixture wav")
    }

    #[test]
    fn decode_wav_pcm16_fixture() {
        let bytes = fixture_bytes();
        let samples = decode_wav_pcm16_mono_16k(&bytes).expect("decode wav");
        assert!(!samples.is_empty());
    }

    #[test]
    fn resolve_trim_sample_range_clamps_to_audio_bounds() {
        let (start_idx, end_idx, start_ms, end_ms) =
            resolve_trim_sample_range(16_000, -500, 5_000, 16_000).expect("trim range");
        assert_eq!(start_idx, 0);
        assert_eq!(end_idx, 16_000);
        assert_eq!(start_ms, 0);
        assert_eq!(end_ms, 1_000);
    }

    #[test]
    fn resolve_trim_sample_range_rejects_invalid_windows() {
        let err = resolve_trim_sample_range(16_000, 500, 500, 16_000).expect_err("should fail");
        assert_eq!(err, "trim_range_invalid");
    }

    #[test]
    fn recording_input_device_id_is_stable_for_same_name_and_index() {
        let id_a = build_recording_input_device_id(2, "USB Mic");
        let id_b = build_recording_input_device_id(2, "USB Mic");
        assert_eq!(id_a, id_b);
    }
}
