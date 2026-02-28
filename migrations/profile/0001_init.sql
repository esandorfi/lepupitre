CREATE TABLE IF NOT EXISTS talk_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audience TEXT,
  goal TEXT,
  duration_target_sec INTEGER,
  talk_number INTEGER,
  stage TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS talk_outlines (
  project_id TEXT PRIMARY KEY,
  outline_md TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quests (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_sec INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  output_type TEXT NOT NULL,
  targets_issues_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS active_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_project_id TEXT
);

CREATE TABLE IF NOT EXISTS quest_attempts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  quest_code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  output_text TEXT,
  audio_artifact_id TEXT,
  transcript_id TEXT,
  feedback_id TEXT
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  audio_artifact_id TEXT,
  transcript_id TEXT,
  feedback_id TEXT
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  local_relpath TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auto_feedback (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  feedback_json_artifact_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_notes (
  feedback_id TEXT PRIMARY KEY,
  note_text TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS peer_reviews (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reviewer_tag TEXT,
  review_json_artifact_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS connection_config (
  profile_id TEXT PRIMARY KEY,
  server_base_url TEXT,
  api_key_ref TEXT,
  remote_user_id TEXT,
  sync_enabled INTEGER NOT NULL DEFAULT 0,
  remote_stt_enabled INTEGER NOT NULL DEFAULT 0,
  last_sync_at TEXT,
  last_error TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sync_state (
  profile_id TEXT PRIMARY KEY,
  cursor TEXT,
  last_full_sync_at TEXT
);

CREATE TABLE IF NOT EXISTS profile_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oplog (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  op_type TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_attempts_project_time ON quest_attempts(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_runs_project_time ON runs(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_sha ON artifacts(sha256);
