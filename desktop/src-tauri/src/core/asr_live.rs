use crate::core::models;

#[derive(Debug, Clone)]
pub struct LivePartial {
    pub text: String,
    pub t0_ms: i64,
    pub t1_ms: i64,
}

#[derive(Debug, Clone)]
pub struct LiveAsrUpdate {
    pub committed: Vec<models::TranscriptSegment>,
    pub partial: Option<LivePartial>,
}

#[derive(Debug, Default)]
pub struct LiveTranscriptState {
    stable: Vec<models::TranscriptSegment>,
    last_committed_end_ms: i64,
}

const MAX_SEGMENTS_PER_DECODE: usize = 200;

impl LiveTranscriptState {
    pub fn new() -> Self {
        Self {
            stable: Vec::new(),
            last_committed_end_ms: 0,
        }
    }

    pub fn apply_decode(
        &mut self,
        segments: &[models::TranscriptSegment],
        commit_cutoff_ms: i64,
    ) -> LiveAsrUpdate {
        let commit_cutoff_ms = commit_cutoff_ms.max(0);
        let mut committed = Vec::new();

        let mut ordered: Vec<models::TranscriptSegment> = segments
            .iter()
            .filter_map(|segment| {
                let text = segment.text.trim();
                if text.is_empty() {
                    return None;
                }
                let t_start_ms = segment.t_start_ms.max(0);
                let t_end_ms = segment.t_end_ms.max(0);
                if t_end_ms <= t_start_ms {
                    return None;
                }
                Some(models::TranscriptSegment {
                    t_start_ms,
                    t_end_ms,
                    text: text.to_string(),
                    confidence: segment.confidence,
                })
            })
            .collect();

        ordered.sort_by(|left, right| {
            (left.t_start_ms, left.t_end_ms, &left.text).cmp(&(
                right.t_start_ms,
                right.t_end_ms,
                &right.text,
            ))
        });
        ordered.dedup_by(|left, right| {
            left.t_start_ms == right.t_start_ms
                && left.t_end_ms == right.t_end_ms
                && left.text == right.text
        });
        if ordered.len() > MAX_SEGMENTS_PER_DECODE {
            let start = ordered.len() - MAX_SEGMENTS_PER_DECODE;
            ordered = ordered.split_off(start);
        }

        for segment in &ordered {
            if segment.t_end_ms <= commit_cutoff_ms && segment.t_end_ms > self.last_committed_end_ms
            {
                committed.push(segment.clone());
            }
        }

        if let Some(last) = committed.last() {
            self.last_committed_end_ms = last.t_end_ms;
            self.stable.extend(committed.clone());
        }

        let uncommitted: Vec<&models::TranscriptSegment> = ordered
            .iter()
            .filter(|segment| segment.t_end_ms > self.last_committed_end_ms)
            .collect();

        let partial = if uncommitted.is_empty() {
            None
        } else {
            let text = uncommitted
                .iter()
                .map(|segment| segment.text.trim())
                .filter(|segment| !segment.is_empty())
                .collect::<Vec<&str>>()
                .join(" ");
            if text.is_empty() {
                None
            } else {
                Some(LivePartial {
                    text,
                    t0_ms: uncommitted.first().unwrap().t_start_ms,
                    t1_ms: uncommitted.last().unwrap().t_end_ms,
                })
            }
        };

        LiveAsrUpdate { committed, partial }
    }

    pub fn committed_segments(&self) -> &[models::TranscriptSegment] {
        &self.stable
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seg(t0: i64, t1: i64, text: &str) -> models::TranscriptSegment {
        models::TranscriptSegment {
            t_start_ms: t0,
            t_end_ms: t1,
            text: text.to_string(),
            confidence: None,
        }
    }

    #[test]
    fn commits_segments_by_cutoff() {
        let mut state = LiveTranscriptState::new();
        let segments = vec![
            seg(0, 1000, "a"),
            seg(1000, 2000, "b"),
            seg(2000, 3000, "c"),
        ];

        let update = state.apply_decode(&segments, 1500);
        assert_eq!(update.committed.len(), 1);
        assert_eq!(update.committed[0].text, "a");
        let partial = update.partial.expect("partial");
        assert_eq!(partial.text, "b c");

        let update = state.apply_decode(&segments, 2500);
        assert_eq!(update.committed.len(), 1);
        assert_eq!(update.committed[0].text, "b");
        let partial = update.partial.expect("partial");
        assert_eq!(partial.text, "c");
    }

    #[test]
    fn commit_all_clears_partial() {
        let mut state = LiveTranscriptState::new();
        let segments = vec![seg(0, 1200, "hello"), seg(1200, 2400, "world")];

        let update = state.apply_decode(&segments, 9999);
        assert_eq!(update.committed.len(), 2);
        assert!(update.partial.is_none());
    }

    #[test]
    fn orders_and_filters_segments() {
        let mut state = LiveTranscriptState::new();
        let segments = vec![
            seg(2000, 3000, "c"),
            seg(0, 1000, "a"),
            seg(1000, 2000, "b"),
            seg(3000, 3000, "bad"),
            seg(3500, 3400, "bad2"),
            seg(4000, 4500, "   "),
        ];

        let update = state.apply_decode(&segments, 2500);
        assert_eq!(update.committed.len(), 2);
        assert_eq!(update.committed[0].text, "a");
        assert_eq!(update.committed[1].text, "b");
        let partial = update.partial.expect("partial");
        assert_eq!(partial.text, "c");
    }

    #[test]
    fn clamps_negative_timestamps() {
        let mut state = LiveTranscriptState::new();
        let segments = vec![
            seg(-50, -10, "bad"),
            seg(0, 0, "bad2"),
            seg(0, 100, "   "),
            seg(-50, 100, "ok"),
        ];

        let update = state.apply_decode(&segments, 1000);
        assert_eq!(update.committed.len(), 1);
        let committed = &update.committed[0];
        assert_eq!(committed.text, "ok");
        assert_eq!(committed.t_start_ms, 0);
        assert_eq!(committed.t_end_ms, 100);
    }
}
