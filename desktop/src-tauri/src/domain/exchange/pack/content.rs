pub(super) fn build_review_template(rubric_bytes: &[u8]) -> Result<Vec<u8>, String> {
    let rubric: serde_json::Value =
        serde_json::from_slice(rubric_bytes).map_err(|e| format!("rubric_parse: {e}"))?;
    let rubric_id = rubric
        .get("rubric_id")
        .and_then(|value| value.as_str())
        .ok_or_else(|| "rubric_id_missing".to_string())?;
    let items = rubric
        .get("items")
        .and_then(|value| value.as_array())
        .ok_or_else(|| "rubric_items_missing".to_string())?;
    let required = rubric
        .get("required_free_text")
        .and_then(|value| value.as_array())
        .ok_or_else(|| "rubric_free_text_missing".to_string())?;

    let mut scores = serde_json::Map::new();
    for item in items {
        if let Some(key) = item.get("key").and_then(|value| value.as_str()) {
            scores.insert(key.to_string(), serde_json::Value::from(3));
        }
    }
    let mut free_text = serde_json::Map::new();
    for item in required {
        if let Some(key) = item.get("key").and_then(|value| value.as_str()) {
            free_text.insert(key.to_string(), serde_json::Value::from(""));
        }
    }

    let template = serde_json::json!({
        "schema_version": "1.0.0",
        "rubric_id": rubric_id,
        "reviewer_tag": "",
        "scores": scores,
        "free_text": free_text,
        "timestamps": []
    });
    serde_json::to_vec_pretty(&template).map_err(|e| format!("review_template_json: {e}"))
}

pub(super) fn build_viewer_html(title: &str) -> String {
    let escaped = escape_html(title);
    format!(
        "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\" />\n<title>{escaped}</title>\n</head>\n<body>\n<h1>{escaped}</h1>\n<p>Open audio.wav and transcript.json from the pack.</p>\n</body>\n</html>\n"
    )
}

fn escape_html(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(ch),
        }
    }
    out
}
