pub(super) const INSERT_RUN: &str =
    "INSERT INTO runs (id, project_id, created_at) VALUES (?1, ?2, ?3)";

pub(super) const UPDATE_RUN_AUDIO: &str = "UPDATE runs SET audio_artifact_id = ?1 WHERE id = ?2";

pub(super) const UPDATE_RUN_TRANSCRIPT: &str = "UPDATE runs SET transcript_id = ?1 WHERE id = ?2";

pub(super) const SELECT_LATEST_RUN: &str =
    "SELECT id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id
 FROM runs
 WHERE project_id = ?1
 ORDER BY created_at DESC
 LIMIT 1";

pub(super) const SELECT_RUN_BY_ID: &str =
    "SELECT id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id
 FROM runs
 WHERE id = ?1";

pub(super) const SELECT_RUNS_BY_PROJECT: &str =
    "SELECT id, project_id, created_at, audio_artifact_id, transcript_id, feedback_id
 FROM runs
 WHERE project_id = ?1
 ORDER BY created_at DESC
 LIMIT ?2";

pub(super) const SELECT_RUN_ANALYSIS_STATE: &str =
    "SELECT transcript_id, feedback_id FROM runs WHERE id = ?1";

pub(super) const INSERT_RUN_FEEDBACK: &str = "INSERT INTO auto_feedback (id, subject_type, subject_id, created_at, feedback_json_artifact_id, overall_score)
 VALUES (?1, ?2, ?3, ?4, ?5, ?6)";

pub(super) const UPDATE_RUN_FEEDBACK_LINK: &str = "UPDATE runs SET feedback_id = ?1 WHERE id = ?2";

pub(super) const SELECT_PROJECT_EXISTS: &str = "SELECT COUNT(*) FROM talk_projects WHERE id = ?1";
