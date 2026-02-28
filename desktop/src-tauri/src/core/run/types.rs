use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct RunSummary {
    pub id: String,
    pub project_id: String,
    pub created_at: String,
    pub audio_artifact_id: Option<String>,
    pub transcript_id: Option<String>,
    pub feedback_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunAnalyzeResponse {
    pub feedback_id: String,
}
