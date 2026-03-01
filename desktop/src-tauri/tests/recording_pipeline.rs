use std::path::PathBuf;

use hound::WavReader;
use lepupitre_lib::core::dsp::Agc;
use lepupitre_lib::core::recording::{LinearResampler, RingBuffer};
use lepupitre_lib::core::vad::{VadConfig, VadState};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RecorderTransportState {
    Idle,
    Recording,
    Paused,
}

fn apply_transport_action(state: RecorderTransportState, action: &str) -> RecorderTransportState {
    match (state, action) {
        (RecorderTransportState::Idle, "start") => RecorderTransportState::Recording,
        (RecorderTransportState::Recording, "pause") => RecorderTransportState::Paused,
        (RecorderTransportState::Paused, "resume") => RecorderTransportState::Recording,
        (_, "stop") => RecorderTransportState::Idle,
        _ => state,
    }
}

fn resolve_trim_sample_range(
    sample_count: usize,
    start_ms: i64,
    end_ms: i64,
    sample_rate: u32,
) -> (usize, usize) {
    let total_duration_ms = ((sample_count as f64 / sample_rate as f64) * 1000.0).round() as i64;
    let start_ms = start_ms.clamp(0, total_duration_ms);
    let end_ms = end_ms.clamp(0, total_duration_ms);
    assert!(end_ms > start_ms);
    let start_idx = ((start_ms as u128 * sample_rate as u128) / 1000) as usize;
    let end_idx = ((end_ms as u128 * sample_rate as u128).div_ceil(1000)) as usize;
    (start_idx.min(sample_count), end_idx.min(sample_count))
}

fn fixture_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("sine_16k_mono.wav")
}

#[test]
fn wav_fixture_pipeline_runs_without_panic() {
    let mut reader = WavReader::open(fixture_path()).expect("fixture wav should open");
    let spec = reader.spec();
    assert_eq!(spec.channels, 1);
    assert_eq!(spec.sample_rate, 16_000);

    let samples: Vec<f32> = reader
        .samples::<i16>()
        .map(|sample| sample.expect("sample read") as f32 / 32768.0)
        .collect();
    assert!(!samples.is_empty());

    let mut resampler = LinearResampler::new(spec.sample_rate, 16_000);
    let mut agc = Agc::new(0.1, 0.5, 8.0, 0.2);
    let mut vad = VadState::default();
    let config = VadConfig::balanced();
    let mut ring = RingBuffer::new(16_000);

    let chunk_sizes = [64usize, 127, 256, 513, 1024];
    let mut idx = 0usize;
    let mut total_processed = 0usize;

    while idx < samples.len() {
        let chunk_len = chunk_sizes[idx % chunk_sizes.len()].min(samples.len() - idx);
        let input = &samples[idx..idx + chunk_len];
        let resampled = resampler.process(input);
        let mut processed = resampled.clone();
        agc.process(&mut processed);

        if !processed.is_empty() {
            let frame_ms = ((processed.len() as f32 / 16_000.0) * 1000.0).round() as u32;
            if frame_ms > 0 {
                let _ = vad.update_from_samples(&processed, frame_ms, &config);
            }
            ring.push(&processed);
            total_processed += processed.len();
        }

        idx += chunk_len;
    }

    assert!(total_processed > 0);
    assert!(ring.snapshot().len() <= 16_000);
}

#[test]
fn recorder_transport_trim_playback_contract() {
    let mut transport = RecorderTransportState::Idle;
    transport = apply_transport_action(transport, "start");
    assert_eq!(transport, RecorderTransportState::Recording);
    transport = apply_transport_action(transport, "pause");
    assert_eq!(transport, RecorderTransportState::Paused);
    transport = apply_transport_action(transport, "resume");
    assert_eq!(transport, RecorderTransportState::Recording);

    let mut reader = WavReader::open(fixture_path()).expect("fixture wav should open");
    let sample_rate = reader.spec().sample_rate;
    let samples: Vec<i16> = reader
        .samples::<i16>()
        .map(|sample| sample.expect("sample read"))
        .collect();
    assert!(!samples.is_empty());

    let (start_idx, end_idx) = resolve_trim_sample_range(samples.len(), 150, 850, sample_rate);
    let trimmed = samples[start_idx..end_idx].to_vec();
    assert!(!trimmed.is_empty());
    assert!(trimmed.len() < samples.len());

    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut cursor = std::io::Cursor::new(Vec::<u8>::new());
    {
        let mut writer = hound::WavWriter::new(&mut cursor, spec).expect("create wav writer");
        for sample in &trimmed {
            writer.write_sample(*sample).expect("write sample");
        }
        writer.finalize().expect("finalize wav");
    }

    let playback = hound::WavReader::new(std::io::Cursor::new(cursor.into_inner()))
        .expect("trimmed wav should be decodable");
    assert_eq!(playback.spec().sample_rate, sample_rate);
    assert_eq!(playback.duration() as usize, trimmed.len());

    transport = apply_transport_action(transport, "stop");
    assert_eq!(transport, RecorderTransportState::Idle);
}
