use crate::core::db;
use chrono::{Days, NaiveDate, Utc};
use rusqlite::{params, OptionalExtension};
use serde::Serialize;
use tauri::AppHandle;

const WEEKLY_TARGET_DEFAULT: i64 = 5;
const CREDIT_STEP: i64 = 50;

#[derive(Debug, Serialize)]
pub struct ProgressSnapshot {
    pub project_id: String,
    pub attempts_total: i64,
    pub feedback_ready_total: i64,
    pub streak_days: i64,
    pub weekly_target: i64,
    pub weekly_completed: i64,
    pub credits: i64,
    pub next_milestone: i64,
    pub last_attempt_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MascotMessage {
    pub id: String,
    pub kind: String,
    pub title: String,
    pub body: String,
    pub cta_label: Option<String>,
    pub cta_route: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TalksBlueprintStep {
    pub id: String,
    pub title: String,
    pub done: bool,
    pub reward_credits: i64,
    pub cta_route: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TalksBlueprint {
    pub project_id: String,
    pub project_title: String,
    pub framework_id: String,
    pub framework_label: String,
    pub framework_summary: String,
    pub completion_percent: i64,
    pub steps: Vec<TalksBlueprintStep>,
    pub next_step_id: Option<String>,
}

pub fn progress_get_snapshot(
    app: &AppHandle,
    profile_id: &str,
    project_id: Option<&str>,
) -> Result<ProgressSnapshot, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let resolved_project_id = resolve_project_id(&conn, project_id)?;
    build_progress_snapshot(&conn, &resolved_project_id)
}

pub fn mascot_get_context_message(
    app: &AppHandle,
    profile_id: &str,
    route_name: &str,
    project_id: Option<&str>,
    locale: Option<&str>,
) -> Result<MascotMessage, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;
    let resolved_project_id = resolve_project_id(&conn, project_id)?;
    let snapshot = build_progress_snapshot(&conn, &resolved_project_id)?;
    Ok(build_mascot_message(
        route_name.trim().to_ascii_lowercase(),
        locale.unwrap_or("en").to_string(),
        &snapshot,
    ))
}

pub fn talks_get_blueprint(
    app: &AppHandle,
    profile_id: &str,
    project_id: &str,
    locale: Option<&str>,
) -> Result<TalksBlueprint, String> {
    db::ensure_profile_exists(app, profile_id)?;
    let conn = db::open_profile(app, profile_id)?;

    let project = conn
        .query_row(
            "SELECT id, title, audience, goal, duration_target_sec, stage
             FROM talk_projects
             WHERE id = ?1",
            params![project_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<i64>>(4)?,
                    row.get::<_, String>(5)?,
                ))
            },
        )
        .map_err(|e| format!("talks_blueprint_project_lookup: {e}"))?;

    let outline_len: i64 = conn
        .query_row(
            "SELECT LENGTH(TRIM(COALESCE(outline_md, '')))
             FROM talk_outlines
             WHERE project_id = ?1",
            params![project.0.as_str()],
            |row| row.get::<_, Option<i64>>(0),
        )
        .optional()
        .map_err(|e| format!("talks_blueprint_outline_lookup: {e}"))?
        .flatten()
        .unwrap_or(0);

    let quest_attempts: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM quest_attempts WHERE project_id = ?1",
            params![project.0.as_str()],
            |row| row.get(0),
        )
        .map_err(|e| format!("talks_blueprint_attempts_lookup: {e}"))?;
    let runs_total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM runs WHERE project_id = ?1",
            params![project.0.as_str()],
            |row| row.get(0),
        )
        .map_err(|e| format!("talks_blueprint_runs_lookup: {e}"))?;
    let quest_feedback: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM quest_attempts
             WHERE project_id = ?1 AND feedback_id IS NOT NULL",
            params![project.0.as_str()],
            |row| row.get(0),
        )
        .map_err(|e| format!("talks_blueprint_quest_feedback_lookup: {e}"))?;
    let run_feedback: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM runs
             WHERE project_id = ?1 AND feedback_id IS NOT NULL",
            params![project.0.as_str()],
            |row| row.get(0),
        )
        .map_err(|e| format!("talks_blueprint_run_feedback_lookup: {e}"))?;

    let fr = locale
        .unwrap_or("en")
        .trim()
        .to_ascii_lowercase()
        .starts_with("fr");
    let framework = select_framework(project.3.as_deref(), project.2.as_deref(), fr);
    let define_done = is_define_done(
        project.1.trim(),
        project.2.as_deref(),
        project.3.as_deref(),
        project.4,
    );
    let structure_done = outline_len > 20;
    let rehearse_done = (quest_attempts + runs_total) > 0;
    let feedback_done = (quest_feedback + run_feedback) > 0;
    let ship_done = project.5 == "export";

    let steps = build_talks_steps(
        fr,
        project.0.as_str(),
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
        project_id: project.0,
        project_title: project.1,
        framework_id: framework.0,
        framework_label: framework.1,
        framework_summary: framework.2,
        completion_percent,
        steps,
        next_step_id,
    })
}

fn build_progress_snapshot(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<ProgressSnapshot, String> {
    let attempts_total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM quest_attempts WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("progress_attempts_total: {e}"))?;

    let feedback_ready_total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM quest_attempts
             WHERE project_id = ?1 AND feedback_id IS NOT NULL",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("progress_feedback_total: {e}"))?;

    let last_attempt_at: Option<String> = conn
        .query_row(
            "SELECT MAX(created_at) FROM quest_attempts WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("progress_last_attempt: {e}"))?
        .flatten();

    let cutoff = (Utc::now() - chrono::Duration::days(6)).to_rfc3339();
    let weekly_completed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM quest_attempts
             WHERE project_id = ?1 AND created_at >= ?2",
            params![project_id, cutoff],
            |row| row.get(0),
        )
        .map_err(|e| format!("progress_weekly_completed: {e}"))?;

    let streak_days = calculate_streak_days(conn, project_id)?;
    let credits = calculate_credits(attempts_total, feedback_ready_total, streak_days);
    let next_milestone = next_milestone(credits);

    Ok(ProgressSnapshot {
        project_id: project_id.to_string(),
        attempts_total,
        feedback_ready_total,
        streak_days,
        weekly_target: WEEKLY_TARGET_DEFAULT,
        weekly_completed,
        credits,
        next_milestone,
        last_attempt_at,
    })
}

fn resolve_project_id(
    conn: &rusqlite::Connection,
    requested_project_id: Option<&str>,
) -> Result<String, String> {
    if let Some(project_id) = requested_project_id {
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM talk_projects WHERE id = ?1",
                params![project_id],
                |row| row.get(0),
            )
            .map_err(|e| format!("progress_project_exists: {e}"))?;
        if exists == 0 {
            return Err("project_not_found".to_string());
        }
        return Ok(project_id.to_string());
    }

    let training_project_id = conn
        .query_row(
            "SELECT id FROM talk_projects WHERE COALESCE(is_training, 0) = 1 LIMIT 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| format!("progress_training_project: {e}"))?;
    if let Some(project_id) = training_project_id {
        return Ok(project_id);
    }

    let active_project_id = conn
        .query_row(
            "SELECT active_project_id FROM active_state WHERE id = 1",
            [],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()
        .map_err(|e| format!("progress_active_project: {e}"))?
        .flatten();
    if let Some(project_id) = active_project_id {
        return Ok(project_id);
    }

    Err("project_not_found".to_string())
}

fn calculate_streak_days(conn: &rusqlite::Connection, project_id: &str) -> Result<i64, String> {
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT substr(created_at, 1, 10) AS day
             FROM quest_attempts
             WHERE project_id = ?1
             ORDER BY day DESC
             LIMIT 90",
        )
        .map_err(|e| format!("progress_streak_prepare: {e}"))?;
    let rows = stmt
        .query_map(params![project_id], |row| row.get::<_, String>(0))
        .map_err(|e| format!("progress_streak_query: {e}"))?;

    let mut days = Vec::new();
    for row in rows {
        let day = row.map_err(|e| format!("progress_streak_row: {e}"))?;
        if let Ok(parsed) = NaiveDate::parse_from_str(&day, "%Y-%m-%d") {
            days.push(parsed);
        }
    }
    Ok(streak_from_days(&days, Utc::now().date_naive()))
}

fn streak_from_days(days_desc: &[NaiveDate], today: NaiveDate) -> i64 {
    let Some(first_day) = days_desc.first().copied() else {
        return 0;
    };
    let yesterday = today.checked_sub_days(Days::new(1)).unwrap_or(today);
    if first_day != today && first_day != yesterday {
        return 0;
    }

    let mut expected = first_day;
    let mut streak = 0_i64;
    for day in days_desc {
        if *day != expected {
            break;
        }
        streak += 1;
        let Some(previous_day) = expected.checked_sub_days(Days::new(1)) else {
            break;
        };
        expected = previous_day;
    }
    streak
}

fn calculate_credits(attempts_total: i64, feedback_ready_total: i64, streak_days: i64) -> i64 {
    let attempt_points = attempts_total.saturating_mul(10);
    let feedback_points = feedback_ready_total.saturating_mul(5);
    let streak_points = streak_days.min(14).saturating_mul(2);
    attempt_points
        .saturating_add(feedback_points)
        .saturating_add(streak_points)
}

fn next_milestone(credits: i64) -> i64 {
    let clamped = credits.max(0);
    ((clamped / CREDIT_STEP) + 1) * CREDIT_STEP
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

fn build_mascot_message(
    route_name: String,
    locale: String,
    snapshot: &ProgressSnapshot,
) -> MascotMessage {
    let fr = locale.trim().to_ascii_lowercase().starts_with("fr");
    let feedback_ready_total = snapshot.feedback_ready_total.max(0);

    if route_name == "training" && snapshot.attempts_total == 0 {
        return if fr {
            MascotMessage {
                id: "first-quest".to_string(),
                kind: "nudge".to_string(),
                title: "Premier pas aujourd'hui".to_string(),
                body: "Fais une prise de 3 minutes pour lancer ta routine.".to_string(),
                cta_label: Some("Demarrer une quete".to_string()),
                cta_route: Some(format!(
                    "/quest/FREE?projectId={}&from=training",
                    snapshot.project_id
                )),
            }
        } else {
            MascotMessage {
                id: "first-quest".to_string(),
                kind: "nudge".to_string(),
                title: "Start your first rep today".to_string(),
                body: "Record one 3-minute take to kick off your speaking loop.".to_string(),
                cta_label: Some("Start a quest".to_string()),
                cta_route: Some(format!(
                    "/quest/FREE?projectId={}&from=training",
                    snapshot.project_id
                )),
            }
        };
    }

    if route_name == "training" && feedback_ready_total > 0 {
        return if fr {
            MascotMessage {
                id: "feedback-ready".to_string(),
                kind: "coach".to_string(),
                title: "Feedback pret".to_string(),
                body: format!(
                    "Tu as {feedback_ready_total} feedback(s) a lire avant la prochaine prise."
                ),
                cta_label: Some("Voir les feedbacks".to_string()),
                cta_route: None,
            }
        } else {
            MascotMessage {
                id: "feedback-ready".to_string(),
                kind: "coach".to_string(),
                title: "Feedback is waiting".to_string(),
                body: format!(
                    "You have {feedback_ready_total} feedback item(s) to review before the next take."
                ),
                cta_label: Some("Review feedback".to_string()),
                cta_route: None,
            }
        };
    }

    if route_name == "training" && snapshot.streak_days >= 3 {
        return if fr {
            MascotMessage {
                id: "streak".to_string(),
                kind: "celebrate".to_string(),
                title: format!("Serie de {} jours", snapshot.streak_days),
                body: "Continue encore une session pour securiser ton rythme hebdomadaire."
                    .to_string(),
                cta_label: Some("Lancer la quete".to_string()),
                cta_route: Some(format!(
                    "/quest/FREE?projectId={}&from=training",
                    snapshot.project_id
                )),
            }
        } else {
            MascotMessage {
                id: "streak".to_string(),
                kind: "celebrate".to_string(),
                title: format!("{}-day streak", snapshot.streak_days),
                body: "Lock in one more session today to keep your weekly rhythm.".to_string(),
                cta_label: Some("Run a quest".to_string()),
                cta_route: Some(format!(
                    "/quest/FREE?projectId={}&from=training",
                    snapshot.project_id
                )),
            }
        };
    }

    if route_name == "talks" {
        let weekly_left = (snapshot.weekly_target - snapshot.weekly_completed).max(0);
        return if fr {
            MascotMessage {
                id: "talks-next-action".to_string(),
                kind: "coach".to_string(),
                title: "Priorite du jour".to_string(),
                body: if weekly_left > 0 {
                    format!(
                        "Planifie {} entrainement(s) court(s) pour tenir ta routine cette semaine.",
                        weekly_left
                    )
                } else {
                    "Ta routine hebdo est validee. Tu peux consolider avec un boss run.".to_string()
                },
                cta_label: Some("Aller au training".to_string()),
                cta_route: Some("/training".to_string()),
            }
        } else {
            MascotMessage {
                id: "talks-next-action".to_string(),
                kind: "coach".to_string(),
                title: "Today's priority".to_string(),
                body: if weekly_left > 0 {
                    format!(
                        "Plan {} short training run(s) to keep your weekly speaking habit on track.",
                        weekly_left
                    )
                } else {
                    "Weekly habit complete. You can consolidate with a boss run.".to_string()
                },
                cta_label: Some("Open Training".to_string()),
                cta_route: Some("/training".to_string()),
            }
        };
    }

    if route_name == "feedback" {
        return if fr {
            MascotMessage {
                id: "feedback-iterate".to_string(),
                kind: "coach".to_string(),
                title: "Boucle d'amelioration".to_string(),
                body: "Choisis deux actions max, puis relance une tentative dans la meme seance."
                    .to_string(),
                cta_label: Some("Lancer une quete".to_string()),
                cta_route: Some(format!(
                    "/quest/FREE?projectId={}&from=training",
                    snapshot.project_id
                )),
            }
        } else {
            MascotMessage {
                id: "feedback-iterate".to_string(),
                kind: "coach".to_string(),
                title: "Close the loop".to_string(),
                body: "Pick at most two actions, then run one more attempt in the same session."
                    .to_string(),
                cta_label: Some("Run a quest".to_string()),
                cta_route: Some(format!(
                    "/quest/FREE?projectId={}&from=training",
                    snapshot.project_id
                )),
            }
        };
    }

    if fr {
        MascotMessage {
            id: "steady".to_string(),
            kind: "coach".to_string(),
            title: "Reste en mouvement".to_string(),
            body:
                "Une courte quete aujourd'hui vaut mieux qu'une longue session remise a plus tard."
                    .to_string(),
            cta_label: Some("Demarrer".to_string()),
            cta_route: Some(format!(
                "/quest/FREE?projectId={}&from=training",
                snapshot.project_id
            )),
        }
    } else {
        MascotMessage {
            id: "steady".to_string(),
            kind: "coach".to_string(),
            title: "Keep momentum simple".to_string(),
            body: "A short quest today beats an ideal long session postponed to tomorrow."
                .to_string(),
            cta_label: Some("Start now".to_string()),
            cta_route: Some(format!(
                "/quest/FREE?projectId={}&from=training",
                snapshot.project_id
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn streak_allows_today_chain() {
        let today = NaiveDate::from_ymd_opt(2026, 2, 27).expect("today");
        let days = vec![
            NaiveDate::from_ymd_opt(2026, 2, 27).expect("d1"),
            NaiveDate::from_ymd_opt(2026, 2, 26).expect("d2"),
            NaiveDate::from_ymd_opt(2026, 2, 25).expect("d3"),
        ];
        assert_eq!(streak_from_days(&days, today), 3);
    }

    #[test]
    fn streak_allows_yesterday_chain() {
        let today = NaiveDate::from_ymd_opt(2026, 2, 27).expect("today");
        let days = vec![
            NaiveDate::from_ymd_opt(2026, 2, 26).expect("d1"),
            NaiveDate::from_ymd_opt(2026, 2, 25).expect("d2"),
        ];
        assert_eq!(streak_from_days(&days, today), 2);
    }

    #[test]
    fn streak_resets_after_gap() {
        let today = NaiveDate::from_ymd_opt(2026, 2, 27).expect("today");
        let days = vec![
            NaiveDate::from_ymd_opt(2026, 2, 23).expect("d1"),
            NaiveDate::from_ymd_opt(2026, 2, 22).expect("d2"),
        ];
        assert_eq!(streak_from_days(&days, today), 0);
    }

    #[test]
    fn next_milestone_rounds_up() {
        assert_eq!(next_milestone(0), 50);
        assert_eq!(next_milestone(49), 50);
        assert_eq!(next_milestone(50), 100);
    }

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

    #[test]
    fn mascot_talks_message_is_route_specific() {
        let snapshot = ProgressSnapshot {
            project_id: "proj_1".to_string(),
            attempts_total: 4,
            feedback_ready_total: 1,
            streak_days: 2,
            weekly_target: 5,
            weekly_completed: 2,
            credits: 42,
            next_milestone: 50,
            last_attempt_at: None,
        };
        let message = build_mascot_message("talks".to_string(), "en".to_string(), &snapshot);
        assert_eq!(message.id, "talks-next-action");
        assert_eq!(message.cta_route.as_deref(), Some("/training"));
    }

    #[test]
    fn mascot_feedback_message_is_route_specific() {
        let snapshot = ProgressSnapshot {
            project_id: "proj_1".to_string(),
            attempts_total: 4,
            feedback_ready_total: 1,
            streak_days: 2,
            weekly_target: 5,
            weekly_completed: 2,
            credits: 42,
            next_milestone: 50,
            last_attempt_at: None,
        };
        let message = build_mascot_message("feedback".to_string(), "en".to_string(), &snapshot);
        assert_eq!(message.id, "feedback-iterate");
        assert!(message
            .cta_route
            .as_deref()
            .unwrap_or_default()
            .contains("/quest/FREE"));
    }
}
