pub mod analysis;
mod analyze;
mod context;
mod notes;
mod repo;
mod timeline;
mod types;

pub use analyze::analyze_attempt;
pub use context::{feedback_context_get, feedback_get};
pub use notes::{feedback_note_get, feedback_note_set};
pub use timeline::feedback_timeline_list;
pub use types::{AnalyzeResponse, FeedbackContext, FeedbackTimelineItem};

#[cfg(test)]
mod tests {
    use super::{repo, timeline};
    use rusqlite::Connection;

    #[test]
    fn timeline_limit_defaults_to_thirty() {
        assert_eq!(timeline::normalize_timeline_limit(None), 30);
    }

    #[test]
    fn timeline_limit_clamps_bounds() {
        assert_eq!(timeline::normalize_timeline_limit(Some(0)), 1);
        assert_eq!(timeline::normalize_timeline_limit(Some(5)), 5);
        assert_eq!(timeline::normalize_timeline_limit(Some(300)), 100);
    }

    #[test]
    fn persist_attempt_feedback_link_rolls_back_when_attempt_missing() {
        let mut conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "CREATE TABLE quest_attempts (
               id TEXT PRIMARY KEY,
               project_id TEXT NOT NULL,
               quest_code TEXT NOT NULL,
               created_at TEXT NOT NULL,
               output_text TEXT,
               audio_artifact_id TEXT,
               transcript_id TEXT,
               feedback_id TEXT
             );
             CREATE TABLE auto_feedback (
               id TEXT PRIMARY KEY,
               subject_type TEXT NOT NULL,
               subject_id TEXT NOT NULL,
               created_at TEXT NOT NULL,
               feedback_json_artifact_id TEXT NOT NULL,
               overall_score INTEGER NOT NULL
             );",
        )
        .expect("schema");

        let err = repo::persist_attempt_feedback_link(
            &mut conn,
            "fb_missing",
            "att_missing",
            "artifact_fb",
            73,
            "2026-02-28T00:00:00Z",
        )
        .expect_err("missing attempt");
        assert_eq!(err, "attempt_update_missing");

        let feedback_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM auto_feedback", [], |row| row.get(0))
            .expect("count");
        assert_eq!(feedback_count, 0);
    }
}
