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
    let chunk_ms = (duration_ms / lines.len() as i64).max(1);

    let total_lines = lines.len();
    let mut segments = Vec::with_capacity(total_lines);
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
