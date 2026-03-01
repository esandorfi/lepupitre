use super::repo;
use super::types::ProgressSnapshot;
use chrono::{Days, NaiveDate, Utc};

const WEEKLY_TARGET_DEFAULT: i64 = 5;
const CREDIT_STEP: i64 = 50;

pub(super) fn build_progress_snapshot(
    conn: &rusqlite::Connection,
    project_id: &str,
) -> Result<ProgressSnapshot, String> {
    let cutoff = (Utc::now() - chrono::Duration::days(6)).to_rfc3339();
    let stats = repo::load_progress_stats(conn, project_id, &cutoff)?;
    let days = repo::load_streak_days(conn, project_id)?;

    let streak_days = streak_from_days(&days, Utc::now().date_naive());
    let credits = calculate_credits(
        stats.attempts_total,
        stats.feedback_ready_total,
        streak_days,
    );
    let next_milestone = next_milestone(credits);

    Ok(ProgressSnapshot {
        project_id: project_id.to_string(),
        attempts_total: stats.attempts_total,
        feedback_ready_total: stats.feedback_ready_total,
        streak_days,
        weekly_target: WEEKLY_TARGET_DEFAULT,
        weekly_completed: stats.weekly_completed,
        credits,
        next_milestone,
        last_attempt_at: stats.last_attempt_at,
    })
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
}
