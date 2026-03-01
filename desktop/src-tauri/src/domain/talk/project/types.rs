use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ProjectListItem {
    pub id: String,
    pub title: String,
    pub audience: Option<String>,
    pub goal: Option<String>,
    pub duration_target_sec: Option<i64>,
    pub talk_number: Option<i64>,
    pub stage: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_active: bool,
}
