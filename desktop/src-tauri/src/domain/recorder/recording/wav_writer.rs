use std::fs::File;
use std::io::{Seek, SeekFrom, Write};

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
