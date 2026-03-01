use super::punctuation_rules::{spoken_rules, PunctInsert, SpokenRule};
use crate::kernel::models;

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

#[cfg(test)]
mod tests {
    use super::*;

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
}
