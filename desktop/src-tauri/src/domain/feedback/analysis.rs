use crate::core::models;
use std::collections::{HashMap, HashSet};

pub fn build_feedback_from_text(text: &str, estimated_sec: i64) -> models::FeedbackV1 {
    let tokens = tokenize(text);
    let word_count = tokens.len() as f64;
    let sentence_count_val = sentence_count(text).max(1) as f64;
    let avg_sentence_words = if word_count > 0.0 {
        word_count / sentence_count_val
    } else {
        0.0
    };

    let duration_min = (estimated_sec.max(30) as f64) / 60.0;
    let wpm = if duration_min > 0.0 {
        word_count / duration_min
    } else {
        0.0
    };

    let filler_count = count_fillers(text, &tokens) as f64;
    let filler_per_min = if duration_min > 0.0 {
        filler_count / duration_min
    } else {
        0.0
    };

    let pause_count = sentence_count(text).saturating_sub(1) as i64;
    let repeat_terms = top_repeats(&tokens, 5);
    let jargon_terms = extract_jargon_terms(text);
    let density_score = (avg_sentence_words * 4.0).min(100.0);

    let mut overall_score = 90.0;
    overall_score -= filler_per_min * 2.5;
    if avg_sentence_words > 18.0 {
        overall_score -= (avg_sentence_words - 18.0) * 1.5;
    }
    if repeat_terms.len() > 3 {
        overall_score -= (repeat_terms.len() as f64 - 3.0) * 1.5;
    }
    let overall_score = overall_score.clamp(0.0, 100.0).round() as i64;

    let mut actions = Vec::new();
    if filler_per_min > 2.0 {
        actions.push(models::FeedbackAction {
            action_id: "reduce_fillers".to_string(),
            title: "Reduce filler words".to_string(),
            why_it_matters: "Fillers dilute clarity and confidence.".to_string(),
            how_to_fix: "Pause silently instead of using fillers.".to_string(),
            target_quest_codes: vec!["D01".to_string()],
        });
    }
    if avg_sentence_words > 18.0 {
        actions.push(models::FeedbackAction {
            action_id: "shorten_sentences".to_string(),
            title: "Shorten long sentences".to_string(),
            why_it_matters: "Shorter sentences keep ideas crisp.".to_string(),
            how_to_fix: "Break each idea into a single line.".to_string(),
            target_quest_codes: vec!["A01".to_string()],
        });
    }
    if actions.len() < 2 && !repeat_terms.is_empty() {
        actions.push(models::FeedbackAction {
            action_id: "vary_terms".to_string(),
            title: "Vary repeated terms".to_string(),
            why_it_matters: "Repetition weakens perceived structure.".to_string(),
            how_to_fix: "Swap repeated words with simpler alternatives.".to_string(),
            target_quest_codes: vec!["A01".to_string()],
        });
    }
    actions.truncate(2);

    models::FeedbackV1 {
        schema_version: "1.0.0".to_string(),
        overall_score,
        top_actions: actions,
        comments: Vec::new(),
        metrics: models::FeedbackMetrics {
            wpm,
            filler_per_min,
            pause_count,
            avg_sentence_words,
            repeat_terms,
            jargon_terms,
            density_score,
        },
    }
}

fn tokenize(text: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut current = String::new();
    for ch in text.chars() {
        if ch.is_ascii_alphanumeric() {
            current.push(ch.to_ascii_lowercase());
        } else if !current.is_empty() {
            out.push(current.clone());
            current.clear();
        }
    }
    if !current.is_empty() {
        out.push(current);
    }
    out
}

fn sentence_count(text: &str) -> usize {
    text.split(['.', '!', '?', '\n'])
        .filter(|chunk| !chunk.trim().is_empty())
        .count()
}

fn count_fillers(text: &str, tokens: &[String]) -> usize {
    let fillers = [
        "um",
        "uh",
        "like",
        "actually",
        "basically",
        "literally",
        "sort",
        "kind",
        "okay",
        "euh",
        "bah",
        "genre",
    ];
    let phrases = ["you know", "du coup"];
    let mut count = tokens
        .iter()
        .filter(|token| fillers.contains(&token.as_str()))
        .count();
    let lower = text.to_ascii_lowercase();
    for phrase in phrases {
        count += lower.matches(phrase).count();
    }
    count
}

fn top_repeats(tokens: &[String], max: usize) -> Vec<String> {
    let mut counts: HashMap<&str, usize> = HashMap::new();
    for token in tokens {
        if token.len() < 3 || is_stopword(token) {
            continue;
        }
        *counts.entry(token.as_str()).or_insert(0) += 1;
    }
    let mut entries: Vec<(&str, usize)> = counts.into_iter().filter(|(_, c)| *c > 1).collect();
    entries.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(b.0)));
    entries
        .into_iter()
        .take(max)
        .map(|(token, _)| token.to_string())
        .collect()
}

fn is_stopword(token: &str) -> bool {
    const STOPWORDS_EN: &[&str] = &[
        "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "with", "is", "are",
        "was", "were", "be", "this", "that", "it", "we", "you", "i", "our", "your", "my", "they",
        "their", "as", "at", "by", "from",
    ];
    const STOPWORDS_FR: &[&str] = &[
        "le", "la", "les", "un", "une", "des", "et", "ou", "mais", "de", "du", "en", "dans", "sur",
        "pour", "avec", "est", "sont", "etre", "ce", "cette", "ces", "je", "tu", "il", "elle",
        "nous", "vous", "ils", "elles", "mon", "ma", "mes", "notre", "votre", "leur", "aux", "au",
    ];
    STOPWORDS_EN.contains(&token) || STOPWORDS_FR.contains(&token)
}

fn extract_jargon_terms(text: &str) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut terms = Vec::new();
    for raw in text.split(|c: char| !c.is_ascii_alphanumeric()) {
        if raw.len() < 3 {
            continue;
        }
        let is_upper = raw.chars().all(|c| !c.is_ascii_lowercase());
        let has_digit = raw.chars().any(|c| c.is_ascii_digit());
        if is_upper || has_digit {
            let token = raw.to_string();
            if seen.insert(token.clone()) {
                terms.push(token);
            }
        }
    }
    terms
}
