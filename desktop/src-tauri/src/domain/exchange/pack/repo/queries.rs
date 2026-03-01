pub(super) const SELECT_ARTIFACT_BY_ID: &str =
    "SELECT local_relpath, sha256, bytes, type FROM artifacts WHERE id = ?1";
pub(super) const SELECT_OUTLINE_MARKDOWN: &str =
    "SELECT outline_md FROM talk_outlines WHERE project_id = ?1";
pub(super) const SELECT_NEXT_TALK_NUMBER: &str =
    "SELECT COALESCE(MAX(talk_number), 0) FROM talk_projects";
pub(super) const SELECT_RUN_EXPORT_REFS: &str =
    "SELECT project_id, audio_artifact_id, transcript_id FROM runs WHERE id = ?1";
pub(super) const SELECT_PROJECT_TITLE_BY_ID: &str = "SELECT title FROM talk_projects WHERE id = ?1";
