use super::repo;
use super::types::{TalksBlueprint, TalksBlueprintStep};

pub(super) fn build_talks_blueprint(
    conn: &rusqlite::Connection,
    project_id: &str,
    locale: Option<&str>,
) -> Result<TalksBlueprint, String> {
    let source = repo::load_talks_blueprint_source(conn, project_id)?;

    let fr = locale
        .unwrap_or("en")
        .trim()
        .to_ascii_lowercase()
        .starts_with("fr");
    let framework = select_framework(source.goal.as_deref(), source.audience.as_deref(), fr);
    let define_done = is_define_done(
        source.project_title.trim(),
        source.audience.as_deref(),
        source.goal.as_deref(),
        source.duration_target_sec,
    );
    let structure_done = source.outline_len > 20;
    let rehearse_done = (source.quest_attempts + source.runs_total) > 0;
    let feedback_done = (source.quest_feedback + source.run_feedback) > 0;
    let ship_done = source.stage == "export";

    let steps = build_talks_steps(
        fr,
        source.project_id.as_str(),
        define_done,
        structure_done,
        rehearse_done,
        feedback_done,
        ship_done,
    );
    let done_count = steps.iter().filter(|step| step.done).count() as i64;
    let completion_percent = ((done_count * 100) / steps.len() as i64).clamp(0, 100);
    let next_step_id = steps
        .iter()
        .find(|step| !step.done)
        .map(|step| step.id.clone());

    Ok(TalksBlueprint {
        project_id: source.project_id,
        project_title: source.project_title,
        framework_id: framework.0,
        framework_label: framework.1,
        framework_summary: framework.2,
        completion_percent,
        steps,
        next_step_id,
    })
}

fn is_define_done(
    title: &str,
    audience: Option<&str>,
    goal: Option<&str>,
    duration_target_sec: Option<i64>,
) -> bool {
    let has_title = !title.trim().is_empty();
    let has_audience = audience.is_some_and(|value| !value.trim().is_empty());
    let has_goal = goal.is_some_and(|value| !value.trim().is_empty());
    let has_duration = duration_target_sec.unwrap_or(0) > 0;
    has_title && has_audience && has_goal && has_duration
}

fn select_framework(
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

fn build_talks_steps(
    fr: bool,
    project_id: &str,
    define_done: bool,
    structure_done: bool,
    rehearse_done: bool,
    feedback_done: bool,
    ship_done: bool,
) -> Vec<TalksBlueprintStep> {
    let mut steps = Vec::with_capacity(5);
    if fr {
        steps.push(TalksBlueprintStep {
            id: "define".to_string(),
            title: "Definir le talk (titre, audience, objectif, duree)".to_string(),
            done: define_done,
            reward_credits: 20,
            cta_route: Some(format!("/talks/{project_id}/define")),
        });
        steps.push(TalksBlueprintStep {
            id: "structure".to_string(),
            title: "Structurer l'outline avec le cadre recommande".to_string(),
            done: structure_done,
            reward_credits: 30,
            cta_route: Some(format!("/talks/{project_id}/builder")),
        });
        steps.push(TalksBlueprintStep {
            id: "rehearse".to_string(),
            title: "Faire une repetition en audio".to_string(),
            done: rehearse_done,
            reward_credits: 25,
            cta_route: Some(format!("/talks/{project_id}/train")),
        });
        steps.push(TalksBlueprintStep {
            id: "feedback".to_string(),
            title: "Generer au moins un feedback".to_string(),
            done: feedback_done,
            reward_credits: 25,
            cta_route: Some(format!("/talks/{project_id}/train")),
        });
        steps.push(TalksBlueprintStep {
            id: "ship".to_string(),
            title: "Passer le talk au stade export".to_string(),
            done: ship_done,
            reward_credits: 40,
            cta_route: Some(format!("/talks/{project_id}/export")),
        });
    } else {
        steps.push(TalksBlueprintStep {
            id: "define".to_string(),
            title: "Define talk scope (title, audience, goal, duration)".to_string(),
            done: define_done,
            reward_credits: 20,
            cta_route: Some(format!("/talks/{project_id}/define")),
        });
        steps.push(TalksBlueprintStep {
            id: "structure".to_string(),
            title: "Build an outline with the recommended framework".to_string(),
            done: structure_done,
            reward_credits: 30,
            cta_route: Some(format!("/talks/{project_id}/builder")),
        });
        steps.push(TalksBlueprintStep {
            id: "rehearse".to_string(),
            title: "Record at least one rehearsal take".to_string(),
            done: rehearse_done,
            reward_credits: 25,
            cta_route: Some(format!("/talks/{project_id}/train")),
        });
        steps.push(TalksBlueprintStep {
            id: "feedback".to_string(),
            title: "Generate at least one feedback pass".to_string(),
            done: feedback_done,
            reward_credits: 25,
            cta_route: Some(format!("/talks/{project_id}/train")),
        });
        steps.push(TalksBlueprintStep {
            id: "ship".to_string(),
            title: "Move this talk to export stage".to_string(),
            done: ship_done,
            reward_credits: 40,
            cta_route: Some(format!("/talks/{project_id}/export")),
        });
    }
    steps
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn define_step_requires_complete_scope() {
        assert!(is_define_done(
            "Demo",
            Some("CTO"),
            Some("Convince"),
            Some(600)
        ));
        assert!(!is_define_done("Demo", Some("CTO"), Some("Convince"), None));
        assert!(!is_define_done(
            "",
            Some("CTO"),
            Some("Convince"),
            Some(600)
        ));
    }

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
