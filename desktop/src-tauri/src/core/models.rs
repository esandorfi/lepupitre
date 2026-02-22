use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct ProfileSummary {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub last_opened_at: Option<String>,
    pub is_active: bool,
    pub size_bytes: u64,
}

#[derive(Debug, Deserialize)]
pub struct ProjectCreatePayload {
    pub title: String,
    pub audience: Option<String>,
    pub goal: Option<String>,
    pub duration_target_sec: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct ProjectSummary {
    pub id: String,
    pub title: String,
    pub audience: Option<String>,
    pub goal: Option<String>,
    pub duration_target_sec: Option<i64>,
    pub talk_number: Option<i64>,
    pub stage: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct OutlineDoc {
    pub project_id: String,
    pub markdown: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ExportResult {
    pub path: String,
}

#[derive(Debug, Serialize)]
pub struct Quest {
    pub code: String,
    pub title: String,
    pub category: String,
    pub estimated_sec: i64,
    pub prompt: String,
    pub output_type: String,
    pub targets_issues: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct QuestDaily {
    pub quest: Quest,
    pub why: String,
    pub due_boss_run: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptSegment {
    pub t_start_ms: i64,
    pub t_end_ms: i64,
    pub text: String,
    pub confidence: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptV1 {
    pub schema_version: String,
    pub language: String,
    pub model_id: Option<String>,
    pub duration_ms: Option<i64>,
    pub segments: Vec<TranscriptSegment>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedbackAction {
    pub action_id: String,
    pub title: String,
    pub why_it_matters: String,
    pub how_to_fix: String,
    pub target_quest_codes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedbackComment {
    pub t_start_ms: i64,
    pub t_end_ms: i64,
    pub severity: String,
    pub label: String,
    pub evidence: Option<serde_json::Value>,
    pub suggestion: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedbackMetrics {
    pub wpm: f64,
    pub filler_per_min: f64,
    pub pause_count: i64,
    pub avg_sentence_words: f64,
    pub repeat_terms: Vec<String>,
    pub jargon_terms: Vec<String>,
    pub density_score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedbackV1 {
    pub schema_version: String,
    pub overall_score: i64,
    pub top_actions: Vec<FeedbackAction>,
    pub comments: Vec<FeedbackComment>,
    pub metrics: FeedbackMetrics,
}
