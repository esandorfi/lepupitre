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
    pub stage: String,
    pub created_at: String,
    pub updated_at: String,
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
