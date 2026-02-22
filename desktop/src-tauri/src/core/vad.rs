use crate::core::dsp;

pub struct VadConfig {
    pub speech_start_ms: u32,
    pub speech_end_ms: u32,
    pub energy_threshold: f32,
}

impl VadConfig {
    pub fn balanced() -> Self {
        Self {
            speech_start_ms: 200,
            speech_end_ms: 700,
            energy_threshold: 0.02,
        }
    }
}

#[derive(Default)]
pub struct VadState {
    in_speech: bool,
    speech_ms: u32,
    silence_ms: u32,
}

#[allow(dead_code)]
pub struct VadDecision {
    pub in_speech: bool,
    pub speech_started: bool,
    pub speech_ended: bool,
}

impl VadState {
    pub fn update(&mut self, energy: f32, frame_ms: u32, config: &VadConfig) -> VadDecision {
        let is_speech = energy >= config.energy_threshold;
        let mut speech_started = false;
        let mut speech_ended = false;

        if is_speech {
            self.speech_ms = self.speech_ms.saturating_add(frame_ms);
            self.silence_ms = 0;
            if !self.in_speech && self.speech_ms >= config.speech_start_ms {
                self.in_speech = true;
                speech_started = true;
            }
        } else {
            self.silence_ms = self.silence_ms.saturating_add(frame_ms);
            self.speech_ms = 0;
            if self.in_speech && self.silence_ms >= config.speech_end_ms {
                self.in_speech = false;
                speech_ended = true;
            }
        }

        VadDecision {
            in_speech: self.in_speech,
            speech_started,
            speech_ended,
        }
    }

    pub fn update_from_samples(
        &mut self,
        samples: &[f32],
        frame_ms: u32,
        config: &VadConfig,
    ) -> VadDecision {
        let energy = dsp::rms(samples);
        self.update(energy, frame_ms, config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vad_requires_minimum_speech() {
        let config = VadConfig::balanced();
        let mut state = VadState::default();
        let mut started = false;
        for _ in 0..3 {
            let decision = state.update(0.05, 50, &config);
            started |= decision.speech_started;
        }
        assert!(!started, "speech should not start before 200ms");
        let decision = state.update(0.05, 50, &config);
        assert!(decision.speech_started);
        assert!(decision.in_speech);
    }

    #[test]
    fn vad_requires_minimum_silence() {
        let config = VadConfig::balanced();
        let mut state = VadState::default();
        for _ in 0..4 {
            state.update(0.05, 50, &config);
        }
        assert!(state.in_speech);

        let mut ended = false;
        for _ in 0..14 {
            let decision = state.update(0.0, 50, &config);
            ended |= decision.speech_ended;
        }
        assert!(ended, "speech should end after 700ms of silence");
        assert!(!state.in_speech);
    }
}
