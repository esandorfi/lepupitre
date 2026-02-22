pub fn rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let mut sum = 0.0f32;
    for sample in samples {
        sum += sample * sample;
    }
    (sum / samples.len() as f32).sqrt().min(1.0)
}

pub struct Agc {
    target_rms: f32,
    min_gain: f32,
    max_gain: f32,
    smoothing: f32,
    gain: f32,
}

impl Agc {
    pub fn new(target_rms: f32, min_gain: f32, max_gain: f32, smoothing: f32) -> Self {
        Self {
            target_rms,
            min_gain,
            max_gain,
            smoothing,
            gain: 1.0,
        }
    }

    pub fn process(&mut self, samples: &mut [f32]) -> f32 {
        if samples.is_empty() {
            return self.gain;
        }
        let current_rms = rms(samples);
        let desired = if current_rms > 1e-6 {
            (self.target_rms / current_rms).clamp(self.min_gain, self.max_gain)
        } else {
            self.max_gain
        };
        self.gain += (desired - self.gain) * self.smoothing;
        for sample in samples {
            *sample = (*sample * self.gain).clamp(-1.0, 1.0);
        }
        self.gain
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rms_is_zero_for_empty() {
        assert_eq!(rms(&[]), 0.0);
    }

    #[test]
    fn agc_pushes_toward_target() {
        let mut agc = Agc::new(0.1, 0.5, 8.0, 0.5);
        let mut samples = vec![0.01f32; 100];
        let gain = agc.process(&mut samples);
        assert!(gain > 1.0);
        assert!(samples.iter().all(|v| v.abs() <= 1.0));
    }
}
