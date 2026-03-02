use crate::kernel::models;
use crate::kernel::time;

pub fn build_edited_transcript(
    source: &models::TranscriptV1,
    edited_text: &str,
) -> Result<models::TranscriptV1, String> {
    let lines: Vec<String> = edited_text
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToOwned::to_owned)
        .collect();
    if lines.is_empty() {
        return Err("transcript_empty".to_string());
    }

    let duration_ms = source
        .duration_ms
        .or_else(|| source.segments.iter().map(|segment| segment.t_end_ms).max())
        .unwrap_or((lines.len() as i64).saturating_mul(1_000))
        .max(lines.len() as i64);

    let total_lines = lines.len();
    let source_segments: Vec<&models::TranscriptSegment> = source
        .segments
        .iter()
        .filter(|segment| segment.t_end_ms > segment.t_start_ms)
        .collect();

    let mut segments = Vec::with_capacity(total_lines);
    if source_segments.is_empty() {
        let chunk_ms = (duration_ms / total_lines as i64).max(1);
        let mut cursor = 0i64;
        for (index, line) in lines.into_iter().enumerate() {
            let is_last = index + 1 == total_lines;
            let end = if is_last {
                duration_ms
            } else {
                (cursor + chunk_ms).min(duration_ms)
            };
            segments.push(models::TranscriptSegment {
                t_start_ms: cursor,
                t_end_ms: end.max(cursor + 1),
                text: line,
                confidence: None,
            });
            cursor = end.max(cursor + 1);
        }
    } else {
        let source_count = source_segments.len();
        let mut previous_end = 0i64;
        for (index, line) in lines.into_iter().enumerate() {
            let start_idx = (index * source_count) / total_lines;
            let mut end_idx = (((index + 1) * source_count) / total_lines).saturating_sub(1);
            if end_idx < start_idx {
                end_idx = start_idx;
            }
            let start_segment = source_segments
                .get(start_idx)
                .copied()
                .unwrap_or(source_segments[0]);
            let end_segment = source_segments
                .get(end_idx)
                .copied()
                .unwrap_or(source_segments[source_count - 1]);
            let mut start_ms = start_segment.t_start_ms.max(previous_end).max(0);
            if start_ms >= duration_ms {
                start_ms = duration_ms.saturating_sub(1).max(0);
            }
            let mut end_ms = end_segment.t_end_ms.max(start_ms + 1);
            if end_ms > duration_ms {
                end_ms = duration_ms;
            }
            if end_ms <= start_ms {
                end_ms = (start_ms + 1).min(duration_ms.max(1));
            }

            segments.push(models::TranscriptSegment {
                t_start_ms: start_ms,
                t_end_ms: end_ms,
                text: line,
                confidence: None,
            });
            previous_end = end_ms;
        }
    }

    Ok(models::TranscriptV1 {
        schema_version: "1.0.0".to_string(),
        language: source.language.clone(),
        model_id: source.model_id.clone(),
        duration_ms: Some(duration_ms),
        segments,
    })
}

pub fn build_transcript_edit_metadata(
    transcript_id: &str,
    source: &models::TranscriptV1,
) -> serde_json::Value {
    serde_json::json!({
        "source_transcript_id": transcript_id,
        "edit_kind": "manual",
        "source_language": source.language,
        "source_model_id": source.model_id,
        "source_duration_ms": source.duration_ms,
        "edited_at": time::now_rfc3339(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_edited_transcript_preserves_metadata() {
        let source = models::TranscriptV1 {
            schema_version: "1.0.0".to_string(),
            language: "en".to_string(),
            model_id: Some("tiny".to_string()),
            duration_ms: Some(4000),
            segments: vec![models::TranscriptSegment {
                t_start_ms: 0,
                t_end_ms: 4000,
                text: "hello".to_string(),
                confidence: Some(0.8),
            }],
        };
        let edited = build_edited_transcript(&source, "line one\nline two").expect("edited");
        assert_eq!(edited.language, "en");
        assert_eq!(edited.model_id.as_deref(), Some("tiny"));
        assert_eq!(edited.duration_ms, Some(4000));
        assert_eq!(edited.segments.len(), 2);
        assert_eq!(edited.segments[0].text, "line one");
        assert_eq!(edited.segments[1].text, "line two");
    }

    #[test]
    fn build_edited_transcript_uses_source_segment_time_windows() {
        let source = models::TranscriptV1 {
            schema_version: "1.0.0".to_string(),
            language: "en".to_string(),
            model_id: None,
            duration_ms: Some(6_000),
            segments: vec![
                models::TranscriptSegment {
                    t_start_ms: 0,
                    t_end_ms: 1_000,
                    text: "a".to_string(),
                    confidence: Some(0.8),
                },
                models::TranscriptSegment {
                    t_start_ms: 1_000,
                    t_end_ms: 2_000,
                    text: "b".to_string(),
                    confidence: Some(0.8),
                },
                models::TranscriptSegment {
                    t_start_ms: 2_000,
                    t_end_ms: 3_000,
                    text: "c".to_string(),
                    confidence: Some(0.8),
                },
                models::TranscriptSegment {
                    t_start_ms: 3_000,
                    t_end_ms: 6_000,
                    text: "d".to_string(),
                    confidence: Some(0.8),
                },
            ],
        };

        let edited = build_edited_transcript(&source, "line one\nline two").expect("edited");
        assert_eq!(edited.segments.len(), 2);
        assert_eq!(edited.segments[0].t_start_ms, 0);
        assert_eq!(edited.segments[0].t_end_ms, 2_000);
        assert_eq!(edited.segments[1].t_start_ms, 2_000);
        assert_eq!(edited.segments[1].t_end_ms, 6_000);
    }

    #[test]
    fn build_edited_transcript_rejects_empty() {
        let source = models::TranscriptV1 {
            schema_version: "1.0.0".to_string(),
            language: "en".to_string(),
            model_id: None,
            duration_ms: Some(1000),
            segments: vec![models::TranscriptSegment {
                t_start_ms: 0,
                t_end_ms: 1000,
                text: "hello".to_string(),
                confidence: None,
            }],
        };
        let err = build_edited_transcript(&source, " \n ").expect_err("empty");
        assert_eq!(err, "transcript_empty");
    }
}
