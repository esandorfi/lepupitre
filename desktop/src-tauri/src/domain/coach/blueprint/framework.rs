pub(super) fn select_framework(
    goal: Option<&str>,
    audience: Option<&str>,
    fr: bool,
) -> (String, String, String) {
    let goal_lc = goal.unwrap_or_default().to_ascii_lowercase();
    let audience_lc = audience.unwrap_or_default().to_ascii_lowercase();
    if goal_lc.contains("convince")
        || goal_lc.contains("persuade")
        || goal_lc.contains("buy-in")
        || goal_lc.contains("align")
    {
        return if fr {
            (
                "problem-solution-impact".to_string(),
                "Probleme -> Solution -> Impact".to_string(),
                "Cadre ideal pour obtenir une decision et clarifier le benefice attendu."
                    .to_string(),
            )
        } else {
            (
                "problem-solution-impact".to_string(),
                "Problem -> Solution -> Impact".to_string(),
                "Best when you need buy-in and a clear decision path for your audience."
                    .to_string(),
            )
        };
    }
    if goal_lc.contains("update")
        || goal_lc.contains("status")
        || audience_lc.contains("leadership")
        || audience_lc.contains("manager")
        || audience_lc.contains("exec")
    {
        return if fr {
            (
                "context-change-decision".to_string(),
                "Contexte -> Changement -> Decision".to_string(),
                "Utile pour les updates: ce qui change, pourquoi, et la decision attendue."
                    .to_string(),
            )
        } else {
            (
                "context-change-decision".to_string(),
                "Context -> Change -> Decision".to_string(),
                "Great for status talks: what changed, why it matters, and what decision is needed."
                    .to_string(),
            )
        };
    }
    if fr {
        (
            "hook-story-proof".to_string(),
            "Hook -> Story -> Proof".to_string(),
            "Cadre polyvalent pour une prise de parole claire, concrete et memorable.".to_string(),
        )
    } else {
        (
            "hook-story-proof".to_string(),
            "Hook -> Story -> Proof".to_string(),
            "Versatile baseline for talks that need clarity, narrative flow, and evidence."
                .to_string(),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn framework_defaults_to_hook_story_proof() {
        let result = select_framework(None, None, false);
        assert_eq!(result.0, "hook-story-proof");
    }

    #[test]
    fn framework_detects_decision_talk() {
        let result = select_framework(Some("Need buy-in from leadership"), Some("managers"), false);
        assert_eq!(result.0, "problem-solution-impact");
    }
}
