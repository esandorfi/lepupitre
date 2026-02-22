use crate::core::{artifacts, db, models};

pub fn load_transcript(
    app: &tauri::AppHandle,
    profile_id: &str,
    transcript_id: &str,
) -> Result<models::TranscriptV1, String> {
    let artifact = artifacts::get_artifact(app, profile_id, transcript_id)?;
    if artifact.artifact_type != "transcript" {
        return Err("artifact_not_transcript".to_string());
    }
    let profile_dir = db::profile_dir(app, profile_id)?;
    let transcript_path = profile_dir.join(&artifact.relpath);
    let bytes = std::fs::read(&transcript_path).map_err(|e| format!("transcript_read: {e}"))?;
    serde_json::from_slice(&bytes).map_err(|e| format!("transcript_parse: {e}"))
}

pub fn transcript_text(transcript: &models::TranscriptV1) -> Result<String, String> {
    let text = transcript
        .segments
        .iter()
        .map(|segment| segment.text.trim())
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<&str>>()
        .join(" ");
    if text.is_empty() {
        return Err("transcript_empty".to_string());
    }
    Ok(text)
}

pub fn transcript_duration_ms(transcript: &models::TranscriptV1) -> Option<i64> {
    transcript
        .segments
        .iter()
        .map(|segment| segment.t_end_ms)
        .max()
}

pub fn transcript_to_srt(transcript: &models::TranscriptV1) -> Result<String, String> {
    if transcript.segments.is_empty() {
        return Err("transcript_empty".to_string());
    }
    let mut out = String::new();
    for (idx, segment) in transcript.segments.iter().enumerate() {
        let start = format_srt_timestamp(segment.t_start_ms);
        let end = format_srt_timestamp(segment.t_end_ms);
        out.push_str(&(idx + 1).to_string());
        out.push('\n');
        out.push_str(&format!("{start} --> {end}\n"));
        out.push_str(segment.text.trim());
        out.push('\n');
        out.push('\n');
    }
    Ok(out)
}

pub fn transcript_to_vtt(transcript: &models::TranscriptV1) -> Result<String, String> {
    if transcript.segments.is_empty() {
        return Err("transcript_empty".to_string());
    }
    let mut out = String::from("WEBVTT\n\n");
    for segment in &transcript.segments {
        let start = format_vtt_timestamp(segment.t_start_ms);
        let end = format_vtt_timestamp(segment.t_end_ms);
        out.push_str(&format!("{start} --> {end}\n"));
        out.push_str(segment.text.trim());
        out.push('\n');
        out.push('\n');
    }
    Ok(out)
}

fn format_srt_timestamp(ms: i64) -> String {
    let total_ms = ms.max(0);
    let hours = total_ms / 3_600_000;
    let minutes = (total_ms % 3_600_000) / 60_000;
    let seconds = (total_ms % 60_000) / 1_000;
    let millis = total_ms % 1_000;
    format!("{hours:02}:{minutes:02}:{seconds:02},{millis:03}")
}

fn format_vtt_timestamp(ms: i64) -> String {
    let total_ms = ms.max(0);
    let hours = total_ms / 3_600_000;
    let minutes = (total_ms % 3_600_000) / 60_000;
    let seconds = (total_ms % 60_000) / 1_000;
    let millis = total_ms % 1_000;
    format!("{hours:02}:{minutes:02}:{seconds:02}.{millis:03}")
}

#[cfg(test)]
mod transcript_tests {
    use super::*;

    #[test]
    fn srt_formats_segments() {
        let transcript = models::TranscriptV1 {
            schema_version: "1.0.0".to_string(),
            language: "en".to_string(),
            model_id: None,
            duration_ms: Some(1200),
            segments: vec![models::TranscriptSegment {
                t_start_ms: 0,
                t_end_ms: 1200,
                text: "Hello".to_string(),
                confidence: None,
            }],
        };
        let srt = transcript_to_srt(&transcript).expect("srt");
        assert!(srt.contains("00:00:00,000 --> 00:00:01,200"));
    }

    #[test]
    fn vtt_formats_segments() {
        let transcript = models::TranscriptV1 {
            schema_version: "1.0.0".to_string(),
            language: "en".to_string(),
            model_id: None,
            duration_ms: Some(1200),
            segments: vec![models::TranscriptSegment {
                t_start_ms: 0,
                t_end_ms: 1200,
                text: "Hello".to_string(),
                confidence: None,
            }],
        };
        let vtt = transcript_to_vtt(&transcript).expect("vtt");
        assert!(vtt.contains("00:00:00.000 --> 00:00:01.200"));
    }
}
