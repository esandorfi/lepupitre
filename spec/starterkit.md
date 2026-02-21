Parfait. Voici le **starter kit “files attendus”** (arborescence + squelettes) aligné avec la RFC-0001, pour que Codex puisse générer le repo sans ambiguïtés.

---

## 1) Arborescence repo (normative)

```text
ttqc/
  README.md
  rfc/
    RFC-0001.md
  schemas/
    transcript.v1.json
    feedback.v1.json
    rubric.v1.json
    peer_review.v1.json
    pack_manifest.v1.json
    backup_manifest.v1.json
  seed/
    quests.v1.json
    rubric.tech_talk_internal.v1.json
  migrations/
    global/
      0001_init.sql
    profile/
      0001_init.sql
  desktop/
    ui/
      package.json
      src/
        app.tsx
        routes/
          home.tsx
          quest.tsx
          feedback.tsx
          talk_builder.tsx
          boss_run.tsx
          settings.tsx
        components/
          Timer.tsx
          AudioRecorder.tsx
          TranscriptViewer.tsx
          FeedbackPanel.tsx
        lib/
          api.ts
          types.ts
    src-tauri/
      Cargo.toml
      tauri.conf.json
      capabilities/
        default.json
      src/
        main.rs
        commands/
          mod.rs
          profile.rs
          project.rs
          quest.rs
          audio.rs
          transcription.rs
          analysis.rs
          run.rs
          pack.rs
          backup.rs
          settings.rs
        core/
          mod.rs
          domain/
            mod.rs
            ids.rs
            entities.rs
            value_objects.rs
          application/
            mod.rs
            usecases/
              mod.rs
              profile_usecases.rs
              project_usecases.rs
              quest_usecases.rs
              audio_usecases.rs
              transcription_usecases.rs
              analysis_usecases.rs
              run_usecases.rs
              pack_usecases.rs
              backup_usecases.rs
              settings_usecases.rs
            reco/
              mod.rs
              rules_v1.rs
          ports/
            mod.rs
            transcription.rs
            storage.rs
            repositories.rs
            pack.rs
            secrets.rs
            clock.rs
            job_queue.rs
          adapters/
            mod.rs
            sqlite/
              mod.rs
              global_db.rs
              profile_db.rs
              migrations.rs
            fs/
              mod.rs
              artifact_store.rs
              paths.rs
            whispercpp/
              mod.rs
              runner.rs
              parser.rs
            zip/
              mod.rs
              pack_zip.rs
              validation.rs
            audio/
              mod.rs
              record.rs
              normalize.rs
            secrets/
              mod.rs
              keyring.rs
            jobs/
              mod.rs
              queue.rs
              events.rs
        viewer_assets/
          index.html
          app.js
          style.css
```

---

## 2) Squelettes Rust indispensables (ports + types)

### 2.1 `ports/transcription.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptV1 {
    pub schema_version: String, // "1.0.0"
    pub language: String,
    pub model_id: Option<String>,
    pub duration_ms: Option<u64>,
    pub segments: Vec<TranscriptSegmentV1>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSegmentV1 {
    pub t_start_ms: u64,
    pub t_end_ms: u64,
    pub text: String,
    pub confidence: Option<f32>,
}

#[derive(Debug, Clone)]
pub struct TranscriptionOptions {
    pub model_id: String,
    pub language_hint: Option<String>,
}

#[async_trait::async_trait]
pub trait TranscriptionProvider: Send + Sync {
    async fn transcribe_wav(
        &self,
        wav_path: &std::path::Path,
        options: &TranscriptionOptions,
    ) -> anyhow::Result<TranscriptV1>;
}
```

### 2.2 `ports/storage.rs`

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ArtifactType {
    AudioWav,
    TranscriptJson,
    FeedbackJson,
    PackZip,
    ExportMarkdown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactRecord {
    pub id: String,
    pub r#type: ArtifactType,
    pub local_relpath: String,
    pub sha256: String,
    pub bytes: u64,
    pub created_at: String,
    pub metadata_json: serde_json::Value,
}

#[async_trait::async_trait]
pub trait ArtifactStore: Send + Sync {
    async fn put_bytes(
        &self,
        artifact_type: ArtifactType,
        filename: &str,
        bytes: Vec<u8>,
        metadata: serde_json::Value,
    ) -> anyhow::Result<ArtifactRecord>;

    async fn resolve_path(&self, artifact_id: &str) -> anyhow::Result<PathBuf>;
}
```

### 2.3 `ports/job_queue.rs` (progress)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobProgressEvent {
    pub job_id: String,
    pub stage: String,
    pub pct: u8,
    pub message: Option<String>,
}

#[async_trait::async_trait]
pub trait JobQueue: Send + Sync {
    async fn spawn_transcription_job(&self, input: serde_json::Value) -> anyhow::Result<String>;
    async fn spawn_analysis_job(&self, input: serde_json::Value) -> anyhow::Result<String>;
}
```

---

## 3) Migrations SQL (global + profile)

### 3.1 `migrations/global/0001_init.sql`

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_opened_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS global_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);
```

### 3.2 `migrations/profile/0001_init.sql`

```sql
CREATE TABLE IF NOT EXISTS talk_projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audience TEXT,
  goal TEXT,
  duration_target_sec INTEGER,
  stage TEXT NOT NULL,
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
  audio_artifact_id TEXT NOT NULL,
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
```

---

## 4) Seed fichiers (quests + rubric)

### 4.1 `seed/quests.v1.json` (extrait)

```json
{
  "schema_version": "1.0.0",
  "quests": [
    {
      "code": "A01",
      "title": "Goal Sentence",
      "category": "start",
      "estimated_sec": 180,
      "prompt": "À la fin, ils sauront ___ pour ___.",
      "output_type": "text",
      "targets_issues": ["no_start", "unclear_goal"]
    },
    {
      "code": "D01",
      "title": "Intro 45s",
      "category": "delivery",
      "estimated_sec": 180,
      "prompt": "Enregistre une intro 45s : promesse + plan.",
      "output_type": "audio",
      "targets_issues": ["weak_intro", "fillers", "pace"]
    }
  ]
}
```

### 4.2 `seed/rubric.tech_talk_internal.v1.json` (complet si besoin, sinon OK en v1)

Tu peux utiliser le `RubricV1` déjà défini dans la RFC.

---

## 5) Pack ZIP : structure + manifest exacts

### 5.1 Structure

```text
pack_<pack_id>.zip
  manifest.json
  run/audio.wav
  run/transcript.json
  run/outline.md
  rubric/rubric.json
  review/review_template.json
  viewer/index.html
  viewer/assets/*
```

### 5.2 `review/review_template.json` (template minimal)

```json
{
  "schema_version": "1.0.0",
  "rubric_id": "tech_talk_internal_v1",
  "reviewer_tag": "",
  "scores": {},
  "free_text": {
    "most_confusing_moment": "",
    "best_moment": "",
    "one_priority": ""
  },
  "timestamps": []
}
```

---

## 6) Tauri : capabilities (fichier “default.json” minimal)

> Le but : n’exposer que les commandes et éviter tout accès FS générique côté frontend.

```json
{
  "identifier": "default",
  "description": "Default capability for TTQC (local-only MVP)",
  "permissions": [
    "core:default"
  ],
  "windows": ["main"],
  "platforms": ["macos", "windows", "linux"]
}
```

*(Ensuite tu relies côté app l’allowlist des commandes via le routing Tauri + ton module `commands/`.)*

---

## 7) Prompt Codex “one-shot” pour générer le squelette

Copie-colle ceci à Codex :

```text
Génère un monorepo Tauri v2 + UI React (ou minimal TS) + backend Rust structuré en domain/application/ports/adapters comme dans l’arborescence fournie.
Implémente :
- global.sqlite + migrations (profiles/settings)
- db.sqlite par profil + migrations (tables définies)
- layout dossiers appdata/profiles/<id>/...
- commands Tauri: profile_list/create/switch, project_create/get_active, quest_get_daily, quest_submit_text
- seed quests depuis seed/quests.v1.json vers table quests au premier lancement du profil
- ArtifactStore local (put_bytes + resolve_path) et enregistrement artifacts en DB
Contrainte : pas de réseau, pas d’accès FS générique depuis UI.
Ajoute des tests unitaires pour la reco rules_v1 (si pas de plan => A01/A03/C01).
```


