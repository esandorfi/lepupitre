mod routes;

use super::types::{MascotMessage, ProgressSnapshot};

pub(super) fn build_mascot_message(
    route_name: String,
    locale: String,
    snapshot: &ProgressSnapshot,
) -> MascotMessage {
    let fr = locale.trim().to_ascii_lowercase().starts_with("fr");
    let feedback_ready_total = snapshot.feedback_ready_total.max(0);

    if route_name == "training" && snapshot.attempts_total == 0 {
        return routes::training_first_quest(fr, &snapshot.project_id);
    }

    if route_name == "training" && feedback_ready_total > 0 {
        return routes::training_feedback_ready(fr, feedback_ready_total);
    }

    if route_name == "training" && snapshot.streak_days >= 3 {
        return routes::training_streak(fr, snapshot.streak_days, &snapshot.project_id);
    }

    if route_name == "talks" {
        let weekly_left = (snapshot.weekly_target - snapshot.weekly_completed).max(0);
        return routes::talks_next_action(fr, weekly_left);
    }

    if route_name == "feedback" {
        return routes::feedback_iterate(fr, &snapshot.project_id);
    }

    routes::steady(fr, &snapshot.project_id)
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
