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

#[derive(Clone, Copy)]
enum PunctInsert {
    Attach,
    Separate,
    Newline,
}

struct SpokenRule {
    phrase: &'static [&'static str],
    replacement: &'static str,
    mode: PunctInsert,
}

pub fn apply_spoken_punctuation(
    segments: &[models::TranscriptSegment],
    language: &str,
) -> Vec<models::TranscriptSegment> {
    let rules = spoken_rules(language);
    if rules.is_empty() {
        return segments.to_vec();
    }

    segments
        .iter()
        .map(|segment| {
            let cleaned = apply_spoken_punctuation_to_text(&segment.text, rules);
            let text = if cleaned.is_empty() {
                segment.text.trim().to_string()
            } else {
                cleaned
            };
            models::TranscriptSegment {
                t_start_ms: segment.t_start_ms,
                t_end_ms: segment.t_end_ms,
                text,
                confidence: segment.confidence,
            }
        })
        .collect()
}

fn spoken_rules(language: &str) -> &'static [SpokenRule] {
    match language {
        "fr" => FR_RULES,
        "en" => EN_RULES,
        _ => &[],
    }
}

fn apply_spoken_punctuation_to_text(text: &str, rules: &[SpokenRule]) -> String {
    let tokens: Vec<String> = text
        .split_whitespace()
        .map(|token| token.to_string())
        .collect();
    if tokens.is_empty() {
        return String::new();
    }

    let lower_tokens: Vec<String> = tokens.iter().map(|token| token.to_lowercase()).collect();
    let mut out = String::new();
    let mut i = 0;

    while i < tokens.len() {
        let mut matched = None;
        for rule in rules {
            if i + rule.phrase.len() > lower_tokens.len() {
                continue;
            }
            let mut ok = true;
            for (offset, part) in rule.phrase.iter().enumerate() {
                if lower_tokens[i + offset] != *part {
                    ok = false;
                    break;
                }
            }
            if ok {
                matched = Some(rule);
                break;
            }
        }

        if let Some(rule) = matched {
            match rule.mode {
                PunctInsert::Attach => {
                    out.push_str(rule.replacement);
                }
                PunctInsert::Separate => {
                    append_token(&mut out, rule.replacement);
                }
                PunctInsert::Newline => {
                    append_newline(&mut out);
                }
            }
            i += rule.phrase.len();
            continue;
        }

        append_token(&mut out, &tokens[i]);
        i += 1;
    }

    out.trim().to_string()
}

fn append_token(out: &mut String, token: &str) {
    if out.is_empty() || out.ends_with('\n') {
        out.push_str(token);
    } else {
        out.push(' ');
        out.push_str(token);
    }
}

fn append_newline(out: &mut String) {
    while out.ends_with(' ') {
        out.pop();
    }
    if !out.ends_with('\n') {
        out.push('\n');
    }
}

const FR_RULES: &[SpokenRule] = &[
    SpokenRule {
        phrase: &["point", "d'interrogation"],
        replacement: "?",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["point", "d", "interrogation"],
        replacement: "?",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["point", "d'exclamation"],
        replacement: "!",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["point", "d", "exclamation"],
        replacement: "!",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["point", "virgule"],
        replacement: ";",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["deux", "points"],
        replacement: ":",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["retour", "a", "la", "ligne"],
        replacement: "
",
        mode: PunctInsert::Newline,
    },
    SpokenRule {
        phrase: &["retour", "à", "la", "ligne"],
        replacement: "
",
        mode: PunctInsert::Newline,
    },
    SpokenRule {
        phrase: &["ouvrir", "la", "parenthese"],
        replacement: "(",
        mode: PunctInsert::Separate,
    },
    SpokenRule {
        phrase: &["ouvrir", "la", "parenthèse"],
        replacement: "(",
        mode: PunctInsert::Separate,
    },
    SpokenRule {
        phrase: &["ouvrez", "la", "parenthese"],
        replacement: "(",
        mode: PunctInsert::Separate,
    },
    SpokenRule {
        phrase: &["ouvrez", "la", "parenthèse"],
        replacement: "(",
        mode: PunctInsert::Separate,
    },
    SpokenRule {
        phrase: &["fermer", "la", "parenthese"],
        replacement: ")",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["fermer", "la", "parenthèse"],
        replacement: ")",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["fermez", "la", "parenthese"],
        replacement: ")",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["fermez", "la", "parenthèse"],
        replacement: ")",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["virgule"],
        replacement: ",",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["point"],
        replacement: ".",
        mode: PunctInsert::Attach,
    },
];

const EN_RULES: &[SpokenRule] = &[
    SpokenRule {
        phrase: &["question", "mark"],
        replacement: "?",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["exclamation", "mark"],
        replacement: "!",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["full", "stop"],
        replacement: ".",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["new", "line"],
        replacement: "
",
        mode: PunctInsert::Newline,
    },
    SpokenRule {
        phrase: &["open", "parenthesis"],
        replacement: "(",
        mode: PunctInsert::Separate,
    },
    SpokenRule {
        phrase: &["close", "parenthesis"],
        replacement: ")",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["comma"],
        replacement: ",",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["colon"],
        replacement: ":",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["semicolon"],
        replacement: ";",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["period"],
        replacement: ".",
        mode: PunctInsert::Attach,
    },
    SpokenRule {
        phrase: &["dot"],
        replacement: ".",
        mode: PunctInsert::Attach,
    },
];

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
    fn spoken_punctuation_applies_french() {
        let segments = vec![models::TranscriptSegment {
            t_start_ms: 0,
            t_end_ms: 1000,
            text: "bonjour virgule retour a la ligne point".to_string(),
            confidence: None,
        }];
        let updated = apply_spoken_punctuation(&segments, "fr");
        assert_eq!(updated[0].text, "bonjour,\n.");
    }

    #[test]
    fn spoken_punctuation_applies_english() {
        let segments = vec![models::TranscriptSegment {
            t_start_ms: 0,
            t_end_ms: 1000,
            text: "hello comma new line period".to_string(),
            confidence: None,
        }];
        let updated = apply_spoken_punctuation(&segments, "en");
        assert_eq!(updated[0].text, "hello,\n.");
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
