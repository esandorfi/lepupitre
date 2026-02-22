use lepupitre_lib::core::dsp::Agc;
use lepupitre_lib::core::recording::{LinearResampler, WavWriter};
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_wav_path() -> std::path::PathBuf {
    let mut path = std::env::temp_dir();
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let pid = std::process::id();
    path.push(format!("lepupitre-recording-{pid}-{stamp}.wav"));
    path
}

#[test]
fn recording_pipeline_writes_valid_wav() {
    let input_rate = 48_000u32;
    let target_rate = 16_000u32;
    let duration_sec = 1.0f32;
    let input_samples = (input_rate as f32 * duration_sec) as usize;
    let input = vec![0.12f32; input_samples];
    let path = temp_wav_path();

    let mut resampler = LinearResampler::new(input_rate, target_rate);
    let mut agc = Agc::new(0.1, 0.5, 8.0, 0.2);
    let mut writer = WavWriter::create(&path, target_rate, 1).expect("wav create");

    let mut total_out = 0usize;
    let mut offset = 0usize;
    while offset < input.len() {
        let end = (offset + 512).min(input.len());
        let chunk = &input[offset..end];
        let mut resampled = resampler.process(chunk);
        agc.process(&mut resampled);
        total_out += resampled.len();
        writer.write_samples(&resampled).expect("wav write");
        offset = end;
    }

    writer.finalize().expect("wav finalize");

    let bytes = fs::read(&path).expect("wav read");
    assert!(bytes.starts_with(b"RIFF"));
    assert_eq!(&bytes[8..12], b"WAVE");

    let expected_len = 44usize + total_out * 2;
    assert_eq!(bytes.len(), expected_len);

    let _ = fs::remove_file(&path);
}
