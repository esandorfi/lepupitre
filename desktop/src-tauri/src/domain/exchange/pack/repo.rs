use rusqlite::{params, Connection, OptionalExtension};

#[derive(Debug)]
pub(super) struct ArtifactRow {
    pub(super) relpath: String,
    pub(super) sha256: String,
    pub(super) bytes: u64,
}

pub(super) fn load_artifact(
    conn: &rusqlite::Connection,
    artifact_id: &str,
    expected_type: &str,
) -> Result<ArtifactRow, String> {
    let row = conn
        .query_row(
            "SELECT local_relpath, sha256, bytes, type FROM artifacts WHERE id = ?1",
            params![artifact_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, String>(3)?,
                ))
            },
        )
        .map_err(|e| format!("artifact_lookup: {e}"))?;
    if row.3 != expected_type {
        return Err("artifact_type_mismatch".to_string());
    }
    Ok(ArtifactRow {
        relpath: row.0,
        sha256: row.1,
        bytes: row.2 as u64,
    })
}

pub(super) fn outline_markdown(
    conn: &rusqlite::Connection,
    project_id: &str,
    project_title: &str,
) -> Result<String, String> {
    let stored: Option<String> = conn
        .query_row(
            "SELECT outline_md FROM talk_outlines WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("outline_lookup: {e}"))?;
    Ok(stored.unwrap_or_else(|| default_outline(project_title)))
}

fn default_outline(title: &str) -> String {
    format!(
        "# {title}\n\n## Opening\n- Hook\n- Promise\n\n## Key points\n- Point 1\n- Point 2\n- Point 3\n\n## Closing\n- Summary\n- Call to action\n"
    )
}

pub(super) fn next_talk_number(conn: &rusqlite::Connection) -> Result<i64, String> {
    let max_value: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(talk_number), 0) FROM talk_projects",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("talk_number_max: {e}"))?;
    Ok(max_value + 1)
}

pub(super) struct PeerReviewImportRows<'a> {
    pub(super) project_id: &'a str,
    pub(super) talk_title: &'a str,
    pub(super) talk_number: i64,
    pub(super) now: &'a str,
    pub(super) outline_text: &'a str,
    pub(super) run_id: &'a str,
    pub(super) run_created_at: &'a str,
    pub(super) audio_artifact_id: &'a str,
    pub(super) transcript_artifact_id: &'a str,
    pub(super) review_id: &'a str,
    pub(super) reviewer_tag: Option<&'a str>,
    pub(super) review_json_artifact_id: &'a str,
}

pub(super) fn persist_peer_review_import_rows(
    conn: &mut Connection,
    rows: PeerReviewImportRows<'_>,
) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
    tx.execute(
        "INSERT INTO talk_projects (id, title, audience, goal, duration_target_sec, talk_number, stage, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            rows.project_id,
            rows.talk_title,
            Option::<String>::None,
            Option::<String>::None,
            Option::<i64>::None,
            rows.talk_number,
            "peer_review",
            rows.now,
            rows.now
        ],
    )
    .map_err(|e| format!("project_insert: {e}"))?;
    tx.execute(
        "INSERT INTO talk_outlines (project_id, outline_md, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![rows.project_id, rows.outline_text, rows.now, rows.now],
    )
    .map_err(|e| format!("outline_insert: {e}"))?;
    tx.execute(
        "INSERT INTO runs (id, project_id, created_at, audio_artifact_id, transcript_id)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            rows.run_id,
            rows.project_id,
            rows.run_created_at,
            rows.audio_artifact_id,
            rows.transcript_artifact_id
        ],
    )
    .map_err(|e| format!("run_insert: {e}"))?;
    tx.execute(
        "INSERT INTO peer_reviews (id, run_id, created_at, reviewer_tag, review_json_artifact_id)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            rows.review_id,
            rows.run_id,
            rows.now,
            rows.reviewer_tag,
            rows.review_json_artifact_id
        ],
    )
    .map_err(|e| format!("peer_review_insert: {e}"))?;
    tx.commit().map_err(|e| format!("commit: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{persist_peer_review_import_rows, PeerReviewImportRows};
    use rusqlite::Connection;

    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("open");
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE talk_projects (
               id TEXT PRIMARY KEY,
               title TEXT NOT NULL,
               audience TEXT,
               goal TEXT,
               duration_target_sec INTEGER,
               talk_number INTEGER,
               stage TEXT NOT NULL,
               created_at TEXT NOT NULL,
               updated_at TEXT NOT NULL,
               is_training INTEGER NOT NULL DEFAULT 0
             );
             CREATE TABLE talk_outlines (
               project_id TEXT PRIMARY KEY,
               outline_md TEXT NOT NULL,
               created_at TEXT NOT NULL,
               updated_at TEXT NOT NULL,
               FOREIGN KEY(project_id) REFERENCES talk_projects(id) ON DELETE CASCADE ON UPDATE CASCADE
             );
             CREATE TABLE runs (
               id TEXT PRIMARY KEY,
               project_id TEXT NOT NULL,
               created_at TEXT NOT NULL,
               audio_artifact_id TEXT,
               transcript_id TEXT,
               feedback_id TEXT,
               FOREIGN KEY(project_id) REFERENCES talk_projects(id) ON DELETE CASCADE ON UPDATE CASCADE
             );
             CREATE TABLE peer_reviews (
               id TEXT PRIMARY KEY,
               run_id TEXT NOT NULL,
               created_at TEXT NOT NULL,
               reviewer_tag TEXT,
               review_json_artifact_id TEXT NOT NULL,
               FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE ON UPDATE CASCADE
             );",
        )
        .expect("schema");
        conn
    }

    #[test]
    fn persist_peer_review_import_rows_inserts_graph_atomically() {
        let mut conn = test_conn();
        persist_peer_review_import_rows(
            &mut conn,
            PeerReviewImportRows {
                project_id: "proj_1",
                talk_title: "Peer review: pack_1",
                talk_number: 1,
                now: "2026-02-28T00:00:00Z",
                outline_text: "# Outline",
                run_id: "run_1",
                run_created_at: "2026-02-28T00:00:00Z",
                audio_artifact_id: "art_audio_1",
                transcript_artifact_id: "art_transcript_1",
                review_id: "peer_1",
                reviewer_tag: Some("alice"),
                review_json_artifact_id: "art_review_1",
            },
        )
        .expect("persist");

        let project_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM talk_projects", [], |row| row.get(0))
            .expect("projects");
        let outline_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM talk_outlines", [], |row| row.get(0))
            .expect("outlines");
        let run_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM runs", [], |row| row.get(0))
            .expect("runs");
        let peer_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM peer_reviews", [], |row| row.get(0))
            .expect("peers");
        assert_eq!(project_count, 1);
        assert_eq!(outline_count, 1);
        assert_eq!(run_count, 1);
        assert_eq!(peer_count, 1);
    }

    #[test]
    fn persist_peer_review_import_rows_rolls_back_on_peer_review_failure() {
        let mut conn = test_conn();
        conn.execute_batch(
            "CREATE TRIGGER fail_peer_insert
             BEFORE INSERT ON peer_reviews
             BEGIN
               SELECT RAISE(FAIL, 'peer insert blocked');
             END;",
        )
        .expect("trigger");

        let err = persist_peer_review_import_rows(
            &mut conn,
            PeerReviewImportRows {
                project_id: "proj_2",
                talk_title: "Peer review: pack_2",
                talk_number: 2,
                now: "2026-02-28T00:00:00Z",
                outline_text: "# Outline",
                run_id: "run_2",
                run_created_at: "2026-02-28T00:00:00Z",
                audio_artifact_id: "art_audio_2",
                transcript_artifact_id: "art_transcript_2",
                review_id: "peer_2",
                reviewer_tag: Some("bob"),
                review_json_artifact_id: "art_review_2",
            },
        )
        .expect_err("peer failure");
        assert!(err.contains("peer_review_insert:"));

        let project_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM talk_projects", [], |row| row.get(0))
            .expect("projects");
        let outline_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM talk_outlines", [], |row| row.get(0))
            .expect("outlines");
        let run_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM runs", [], |row| row.get(0))
            .expect("runs");
        let peer_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM peer_reviews", [], |row| row.get(0))
            .expect("peers");
        assert_eq!(project_count, 0);
        assert_eq!(outline_count, 0);
        assert_eq!(run_count, 0);
        assert_eq!(peer_count, 0);
    }
}
