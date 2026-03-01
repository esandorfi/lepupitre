mod framework;
mod steps;

use super::repo;
use super::types::TalksBlueprint;

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
    let framework =
        framework::select_framework(source.goal.as_deref(), source.audience.as_deref(), fr);
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

    let steps = steps::build_talks_steps(
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
}
