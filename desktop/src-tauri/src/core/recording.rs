use std::fs::File;
use std::io::{Seek, SeekFrom, Write};

pub struct RingBuffer {
    data: Vec<f32>,
    write_pos: usize,
    filled: bool,
}

impl RingBuffer {
    pub fn new(capacity: usize) -> Self {
        Self {
            data: vec![0.0; capacity],
            write_pos: 0,
            filled: false,
        }
    }

    pub fn push(&mut self, samples: &[f32]) {
        if self.data.is_empty() {
            return;
        }
        for sample in samples {
            self.data[self.write_pos] = *sample;
            self.write_pos = (self.write_pos + 1) % self.data.len();
            if self.write_pos == 0 {
                self.filled = true;
            }
        }
    }

    pub fn snapshot(&self) -> Vec<f32> {
        if !self.filled {
            return self.data[..self.write_pos].to_vec();
        }
        let mut out = Vec::with_capacity(self.data.len());
        out.extend_from_slice(&self.data[self.write_pos..]);
        out.extend_from_slice(&self.data[..self.write_pos]);
        out
    }
}

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
            return input.to_vec();
        }

        self.buffer.extend_from_slice(input);
        let mut output = Vec::new();
        let len = self.buffer.len() as f32;

        while self.pos + 1.0 < len {
            let left = self.pos.floor() as usize;
            let right = left + 1;
            let weight = self.pos - left as f32;
            let sample = self.buffer[left] * (1.0 - weight) + self.buffer[right] * weight;
            output.push(sample);
            self.pos += self.ratio;
        }

        let drop = self.pos.floor() as usize;
        if drop > 0 {
            self.buffer.drain(0..drop);
            self.pos -= drop as f32;
        }

        output
    }
}

pub struct WavWriter {
    file: File,
    data_bytes: u64,
    sample_rate: u32,
    channels: u16,
}

impl WavWriter {
    pub fn create(path: &std::path::Path, sample_rate: u32, channels: u16) -> Result<Self, String> {
        let file = File::create(path).map_err(|e| format!("wav_create: {e}"))?;
        let mut writer = Self {
            file,
            data_bytes: 0,
            sample_rate,
            channels,
        };
        writer.write_header(0)?;
        Ok(writer)
    }

    pub fn write_samples(&mut self, samples: &[f32]) -> Result<(), String> {
        for sample in samples {
            let clamped = sample.clamp(-1.0, 1.0);
            let value = if clamped < 0.0 {
                (clamped * 32768.0) as i16
            } else {
                (clamped * 32767.0) as i16
            };
            self.file
                .write_all(&value.to_le_bytes())
                .map_err(|e| format!("wav_write: {e}"))?;
            self.data_bytes += 2;
        }
        Ok(())
    }

    pub fn finalize(mut self) -> Result<(), String> {
        self.write_header(self.data_bytes)?;
        self.file.flush().map_err(|e| format!("wav_flush: {e}"))?;
        Ok(())
    }

    fn write_header(&mut self, data_bytes: u64) -> Result<(), String> {
        let byte_rate = self.sample_rate * self.channels as u32 * 2;
        let block_align = self.channels * 2;
        let riff_size = 36u64 + data_bytes;

        self.file
            .seek(SeekFrom::Start(0))
            .map_err(|e| format!("wav_seek: {e}"))?;
        self.file
            .write_all(b"RIFF")
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(&(riff_size as u32).to_le_bytes())
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(b"WAVE")
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(b"fmt ")
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(&16u32.to_le_bytes())
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(&1u16.to_le_bytes())
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(&self.channels.to_le_bytes())
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(&self.sample_rate.to_le_bytes())
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(&byte_rate.to_le_bytes())
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(&block_align.to_le_bytes())
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(&16u16.to_le_bytes())
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(b"data")
            .map_err(|e| format!("wav_header: {e}"))?;
        self.file
            .write_all(&(data_bytes as u32).to_le_bytes())
            .map_err(|e| format!("wav_header: {e}"))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ring_buffer_wraps_and_orders() {
        let mut ring = RingBuffer::new(5);
        ring.push(&[1.0, 2.0, 3.0]);
        assert_eq!(ring.snapshot(), vec![1.0, 2.0, 3.0]);

        ring.push(&[4.0, 5.0, 6.0]);
        assert_eq!(ring.snapshot(), vec![2.0, 3.0, 4.0, 5.0, 6.0]);
    }

    #[test]
    fn resampler_downsamples_linearly() {
        let mut resampler = LinearResampler::new(4, 2);
        let output = resampler.process(&[0.0, 1.0, 2.0, 3.0]);
        assert_eq!(output.len(), 2);
        assert!((output[0] - 0.0).abs() < 1e-6);
        assert!((output[1] - 2.0).abs() < 1e-6);
    }
}
