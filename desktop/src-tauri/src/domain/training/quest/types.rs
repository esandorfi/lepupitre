use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct QuestAttemptSummary {
    pub id: String,
    pub quest_code: String,
    pub quest_title: String,
    pub output_type: String,
    pub created_at: String,
    pub has_audio: bool,
    pub has_transcript: bool,
    pub has_feedback: bool,
    pub feedback_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct QuestReportItem {
    pub quest_code: String,
    pub quest_title: String,
    pub quest_prompt: String,
    pub output_type: String,
    pub category: String,
    pub estimated_sec: i64,
    pub attempt_id: Option<String>,
    pub attempt_created_at: Option<String>,
    pub has_audio: bool,
    pub has_transcript: bool,
    pub has_feedback: bool,
    pub feedback_id: Option<String>,
}
