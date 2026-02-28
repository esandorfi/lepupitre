pub(super) const SELECT_PROJECT_FOR_BLUEPRINT: &str =
    "SELECT id, title, audience, goal, duration_target_sec, stage
 FROM talk_projects
 WHERE id = ?1";

pub(super) const SELECT_OUTLINE_LENGTH: &str = "SELECT LENGTH(TRIM(COALESCE(outline_md, '')))
 FROM talk_outlines
 WHERE project_id = ?1";

pub(super) const SELECT_QUEST_ATTEMPTS_COUNT: &str =
    "SELECT COUNT(*) FROM quest_attempts WHERE project_id = ?1";

pub(super) const SELECT_RUNS_COUNT: &str = "SELECT COUNT(*) FROM runs WHERE project_id = ?1";

pub(super) const SELECT_QUEST_FEEDBACK_COUNT: &str = "SELECT COUNT(*) FROM quest_attempts
 WHERE project_id = ?1 AND feedback_id IS NOT NULL";

pub(super) const SELECT_RUN_FEEDBACK_COUNT: &str = "SELECT COUNT(*) FROM runs
 WHERE project_id = ?1 AND feedback_id IS NOT NULL";

pub(super) const SELECT_PROGRESS_ATTEMPTS_COUNT: &str =
    "SELECT COUNT(*) FROM quest_attempts WHERE project_id = ?1";

pub(super) const SELECT_PROGRESS_FEEDBACK_COUNT: &str = "SELECT COUNT(*) FROM quest_attempts
 WHERE project_id = ?1 AND feedback_id IS NOT NULL";

pub(super) const SELECT_PROGRESS_LAST_ATTEMPT: &str =
    "SELECT MAX(created_at) FROM quest_attempts WHERE project_id = ?1";

pub(super) const SELECT_PROGRESS_WEEKLY_COMPLETED: &str = "SELECT COUNT(*) FROM quest_attempts
 WHERE project_id = ?1 AND created_at >= ?2";

pub(super) const SELECT_PROJECT_EXISTS: &str = "SELECT COUNT(*) FROM talk_projects WHERE id = ?1";

pub(super) const SELECT_TRAINING_PROJECT: &str =
    "SELECT id FROM talk_projects WHERE COALESCE(is_training, 0) = 1 LIMIT 1";

pub(super) const SELECT_ACTIVE_PROJECT: &str =
    "SELECT active_project_id FROM active_state WHERE id = 1";

pub(super) const SELECT_STREAK_DAYS: &str = "SELECT DISTINCT substr(created_at, 1, 10) AS day
 FROM quest_attempts
 WHERE project_id = ?1
 ORDER BY day DESC
 LIMIT 90";
