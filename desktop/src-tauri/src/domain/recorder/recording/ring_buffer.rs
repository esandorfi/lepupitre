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

    #[allow(dead_code)]
    pub fn snapshot(&self) -> Vec<f32> {
        if !self.filled {
            return self.data[..self.write_pos].to_vec();
        }
        let mut out = Vec::with_capacity(self.data.len());
        out.extend_from_slice(&self.data[self.write_pos..]);
        out.extend_from_slice(&self.data[..self.write_pos]);
        out
    }

    pub fn snapshot_last(&self, count: usize) -> Vec<f32> {
        if self.data.is_empty() {
            return Vec::new();
        }
        let available = if self.filled {
            self.data.len()
        } else {
            self.write_pos
        };
        if available == 0 {
            return Vec::new();
        }
        let count = count.min(available);
        if !self.filled {
            let start = available - count;
            return self.data[start..available].to_vec();
        }
        let end = self.write_pos;
        let start = (end + self.data.len() - count) % self.data.len();
        let mut out = Vec::with_capacity(count);
        if start < end {
            out.extend_from_slice(&self.data[start..end]);
        } else {
            out.extend_from_slice(&self.data[start..]);
            out.extend_from_slice(&self.data[..end]);
        }
        out
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
    fn ring_buffer_snapshot_last_returns_tail() {
        let mut ring = RingBuffer::new(5);
        ring.push(&[1.0, 2.0, 3.0]);
        assert_eq!(ring.snapshot_last(2), vec![2.0, 3.0]);

        ring.push(&[4.0, 5.0, 6.0, 7.0]);
        assert_eq!(ring.snapshot_last(2), vec![6.0, 7.0]);
    }
}
