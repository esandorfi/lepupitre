use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeResponse {
    pub feedback_id: String,
}

#[derive(Debug, Serialize)]
pub struct FeedbackContext {
    pub subject_type: String,
    pub subject_id: String,
    pub project_id: String,
    pub quest_code: Option<String>,
    pub quest_title: Option<String>,
    pub run_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FeedbackTimelineItem {
    pub id: String,
    pub created_at: String,
    pub overall_score: i64,
    pub subject_type: String,
    pub project_id: String,
    pub quest_code: Option<String>,
    pub quest_title: Option<String>,
    pub run_id: Option<String>,
    pub note_updated_at: Option<String>,
}
