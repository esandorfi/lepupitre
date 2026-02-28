# Architecture Overview

## Stack
- Desktop shell: Tauri v2
- Backend/core: Rust
- UI: Vue 3 + Vite + TypeScript + Vue Router + Nuxt UI + Tailwind
- Storage: SQLite (global + per profile) + filesystem artifacts
- Speech-to-text: local whisper.cpp sidecar

## System model
- Hexagonal architecture is the default model.
- `commands/`: small Tauri IPC surface.
- `core/domain`: entities, invariants, identifiers.
- `core/application/usecases`: business orchestration.
- `core/ports`: contracts (`TranscriptionProvider`, `ArtifactStore`, etc.).
- `core/adapters`: sqlite/fs/whisper/zip/secrets/jobs.

## Baseline decisions
1. UI stack is standardized on Vue.
2. Local-first and offline by default.
3. No generic filesystem access from UI.
4. New long-term decisions go to `spec/active/DECISIONS.md`.
5. Historical ADRs stay in `docs/archive/adr/` (read-only history).

## Security baseline
- Task-oriented IPC only.
- ZIP import validation (path traversal and size limits).
- Secrets are not stored in SQLite (use keyring/stronghold).
- Least-privilege capabilities and strict CSP.
- Preference keys containing sensitive fragments (`token`, `secret`, `password`, `credential`, `api_key`, `private_key`) are rejected at IPC boundary.
- DB diagnostics payload is metadata-only (schema/migration/integrity counters), never paths/content dumps.

## Local SQL security posture
- SQLite stores product/runtime state only, not credentials or remote tokens.
- Diagnostics and recovery runbooks use metadata checks only; no SQL row dumps in default operator flow.
- Backup artifacts are local-only operational snapshots and must stay on trusted storage under app data directories.
- Encryption-at-rest decision for current scope:
  - no app-layer DB encryption is added in this phase,
  - rely on OS/device encryption controls (BitLocker/FileVault/LUKS or equivalent).

## Preference persistence baseline
- UI preference access is centralized in `desktop/ui/src/lib/preferencesStorage.ts`.
- Primary backend is Tauri IPC commands:
  - `preference_global_get` / `preference_global_set`
  - `preference_profile_get` / `preference_profile_set`
- Browser `localStorage` remains a compatibility fallback for UI-only development and runtime fallback.
- Ownership:
  - global scope: theme, locale, nav mode/metrics, ASR settings, workspace toolbar colors.
- profile scope: hero quest selection, training achievement memory, feedback reviewed state.

## SQLite data-access baseline
- Keep `rusqlite` as the backend driver.
- Centralize SQL by domain in DB modules:
  - `core/<domain>/repo.rs` for typed DB access functions.
  - `core/<domain>/queries.rs` for SQL statements/query builders.
- Keep Tauri command files orchestration-only (no direct SQL).
- Keep raw SQL for reporting, complex joins, and performance-critical paths, with tests and query-plan checks.

## Aggregate consistency pattern
- Domain aggregate boundaries define transaction boundaries.
- Multi-step writes that build one domain aggregate must commit atomically or roll back as one unit.
- Required guardrails:
  - check affected-row counts on critical link updates,
  - fail fast on missing subjects/references,
  - add rollback tests for injected failure paths.
- Cross-resource writes (SQLite + filesystem) require a compensation/finalization strategy:
  - stage file writes first and commit DB links only when files are valid, or
  - commit DB first and finalize files with explicit cleanup on failure.
- Example: `peer_review_import` is treated as one aggregate write (`talk_projects` + `talk_outlines` + `runs` + `peer_reviews`) and persisted in one DB transaction.

### Multi-resource contract matrix
- `peer_review_import` (`core/pack.rs`):
  - Resources: artifact files + `artifacts` rows + aggregate rows (`talk_projects`, `talk_outlines`, `runs`, `peer_reviews`).
  - Contract: aggregate rows are transactional; on aggregate persist failure, created artifacts are compensated via `artifacts::delete_artifacts`.
- `run_analyze` (`commands/run.rs`):
  - Resources: feedback artifact file + `artifacts` row + `auto_feedback`/`runs` link rows.
  - Contract: link rows are transactional; if link persistence fails, feedback artifact is compensated via `artifacts::delete_artifact`.
- `analyze_attempt` (`core/feedback.rs`):
  - Resources: feedback artifact file + `artifacts` row + `auto_feedback`/`quest_attempts` link rows.
  - Contract: link rows are transactional; if link persistence fails, feedback artifact is compensated via `artifacts::delete_artifact`.
- `pack_export` (`core/pack.rs`):
  - Resources: generated ZIP file + `artifacts` row.
  - Contract: artifact registration is centralized in `artifacts::register_existing_file` and cleans up the ZIP on row insert failure.
- `store_bytes` / `finalize_draft` (`core/artifacts.rs`):
  - Resources: written file + `artifacts` row.
  - Contract: on row insert failure, file cleanup is automatic in the artifact layer.

## SQLite migration flow
- Migrations are executed at runtime when a DB is opened:
  - global DB on `open_global`,
  - profile DB on `open_profile`.
- Applied versions are tracked in `schema_migrations`.
- Migration continuity is strict:
  - applied versions must match the ordered migration prefix,
  - gaps/out-of-order histories fail fast.
- Upgrade behavior for users:
  - app updates keep existing local DB files,
  - pending migrations run automatically on first open,
  - profile DB upgrades are lazy per profile (when that profile is opened).
- Safety/operability:
  - before applying pending migrations on an existing DB, a pre-migration snapshot is created under a local `backups/` directory,
  - snapshot retention is bounded to keep disk usage predictable,
  - startup integrity/open failures trigger a deterministic recovery path:
    - quarantine current DB files under `corrupted/`,
    - restore the latest matching snapshot from `backups/` when available,
    - fail with explicit `db_recovery_no_snapshot` when no safe snapshot exists.
  - DB diagnostics can report schema/migration continuity, integrity-check result, and FK-check violations.
  - diagnostics are exposed via IPC command `profile_db_diagnostics` (global + optional profile report).
- Contributor rules:
  - add new migrations as append-only ordered steps,
  - do not mutate historical migration versions in place,
  - include fresh-install and upgrade-path tests when schema behavior changes.

## Observability baseline
- Structured logs in development.
- Correlation by `job_id` across transcription/analysis flows.
- Normalized UI-facing errors (`IPC_INVALID_*`, `IPC_COMMAND_FAILED`, etc.).

## Scale path
1. Stable local/offline MVP.
2. Optional remote STT.
3. Optional cloud sync.
4. Preserve local data compatibility at each step.
