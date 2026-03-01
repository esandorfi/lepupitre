use crate::kernel::models;
use crate::platform::asr_sidecar;
use std::time::{Duration, Instant};

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
