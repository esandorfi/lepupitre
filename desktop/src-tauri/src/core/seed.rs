use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct QuestSeedFile {
    pub schema_version: String,
    pub quests: Vec<QuestSeed>,
}

#[derive(Debug, Deserialize)]
pub struct QuestSeed {
    pub code: String,
    pub title: String,
    pub category: String,
    pub estimated_sec: i64,
    pub prompt: String,
    pub output_type: String,
    pub targets_issues: Vec<String>,
}
