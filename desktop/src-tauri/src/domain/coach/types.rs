use serde::Serialize;

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

pub(super) struct ProgressStats {
    pub attempts_total: i64,
    pub feedback_ready_total: i64,
    pub weekly_completed: i64,
    pub last_attempt_at: Option<String>,
}

pub(super) struct TalksBlueprintSource {
    pub project_id: String,
    pub project_title: String,
    pub audience: Option<String>,
    pub goal: Option<String>,
    pub duration_target_sec: Option<i64>,
    pub stage: String,
    pub outline_len: i64,
    pub quest_attempts: i64,
    pub runs_total: i64,
    pub quest_feedback: i64,
    pub run_feedback: i64,
}
