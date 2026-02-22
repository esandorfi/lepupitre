use std::path::PathBuf;

use hound::WavReader;
use lepupitre_lib::core::dsp::Agc;
use lepupitre_lib::core::recording::{LinearResampler, RingBuffer};
use lepupitre_lib::core::vad::{VadConfig, VadState};

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
