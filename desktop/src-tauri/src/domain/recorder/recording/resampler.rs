pub struct LinearResampler {
    input_rate: u32,
    target_rate: u32,
    ratio: f32,
    buffer: Vec<f32>,
    pos: f32,
}

impl LinearResampler {
    pub fn new(input_rate: u32, target_rate: u32) -> Self {
        let ratio = input_rate as f32 / target_rate as f32;
        Self {
            input_rate,
            target_rate,
            ratio,
            buffer: Vec::new(),
            pos: 0.0,
        }
    }

    pub fn process(&mut self, input: &[f32]) -> Vec<f32> {
        if self.input_rate == self.target_rate {
            self.buffer.clear();
            self.pos = 0.0;
            return input.to_vec();
        }

        if !self.pos.is_finite() {
            self.buffer.clear();
            self.pos = 0.0;
        }

        self.buffer.extend_from_slice(input);
        let mut output = Vec::new();
        let len = self.buffer.len() as f32;

        while self.pos + 1.0 < len {
            let left = self.pos.floor() as usize;
            let right = left + 1;
            if right >= self.buffer.len() {
                break;
            }
            let weight = self.pos - left as f32;
            let sample = self.buffer[left] * (1.0 - weight) + self.buffer[right] * weight;
            output.push(sample);
            self.pos += self.ratio;
        }

        let drop = self.pos.floor() as usize;
        if drop > 0 {
            let drop = drop.min(self.buffer.len());
            if drop == self.buffer.len() {
                self.buffer.clear();
                self.pos = 0.0;
            } else {
                self.buffer.drain(0..drop);
                self.pos -= drop as f32;
            }
        }

        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resampler_downsamples_linearly() {
        let mut resampler = LinearResampler::new(4, 2);
        let output = resampler.process(&[0.0, 1.0, 2.0, 3.0]);
        assert_eq!(output.len(), 2);
        assert!((output[0] - 0.0).abs() < 1e-6);
        assert!((output[1] - 2.0).abs() < 1e-6);
    }

    #[test]
    fn resampler_handles_large_ratio() {
        let mut resampler = LinearResampler::new(48_000, 16_000);
        let input = vec![0.1f32; 512];
        let output = resampler.process(&input);
        assert!(!output.is_empty());
    }

    #[test]
    fn resampler_survives_varied_rates_and_chunks() {
        let rates = [8_000, 12_000, 16_000, 22_050, 44_100, 48_000];
        for input_rate in rates {
            let mut resampler = LinearResampler::new(input_rate, 16_000);
            for len in 0..128 {
                let input = vec![0.01f32; len];
                let output = resampler.process(&input);
                assert!(output.iter().all(|sample| sample.is_finite()));
            }
        }
    }
}
