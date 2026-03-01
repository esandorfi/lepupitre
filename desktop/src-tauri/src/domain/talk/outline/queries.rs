pub(super) const SELECT_PROJECT_TITLE: &str = "SELECT title FROM talk_projects WHERE id = ?1";
pub(super) const SELECT_STORED_OUTLINE: &str =
    "SELECT outline_md, updated_at FROM talk_outlines WHERE project_id = ?1";
pub(super) const SELECT_PROJECT_EXISTS: &str = "SELECT COUNT(*) FROM talk_projects WHERE id = ?1";
pub(super) const UPSERT_OUTLINE: &str = "INSERT INTO talk_outlines (project_id, outline_md, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(project_id) DO UPDATE SET outline_md = excluded.outline_md, updated_at = excluded.updated_at";
pub(super) const SELECT_OUTLINE_MARKDOWN: &str =
    "SELECT outline_md FROM talk_outlines WHERE project_id = ?1";
