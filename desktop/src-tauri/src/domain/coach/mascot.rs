use super::types::{MascotMessage, ProgressSnapshot};

pub(super) fn build_mascot_message(
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
