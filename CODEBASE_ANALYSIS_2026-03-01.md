# Le Pupitre Codebase Analysis (2026-03-01)

## 1. Scope and method

This analysis is based on direct inspection of:

- Tauri entrypoints and command registration (`desktop/src-tauri/src/lib.rs`)
- Rust backend layers (`commands/`, `domain/`, `platform/`, `kernel/`)
- Vue UI layers (`desktop/ui/src`)
- IPC contracts (`desktop/ui/src/schemas/ipc.ts`)
- SQLite migrations (`migrations/global`, `migrations/profile`)
- CI and quality gates (`.github/workflows/ci.yml`, scripts)
- Existing architecture docs (`docs/architecture/*.md`)

The goal is to explain architecture, use-cases, cross-layer communication, patterns, and quality/security/performance posture for desktop use on macOS, Windows, and Linux.

## 2. Executive summary

### Overall assessment

- Architecture quality: strong, pragmatic domain-first baseline.
- Domain separation: mostly good; command wrappers are thin for most bounded contexts.
- SQL separation: good direction and mostly enforced by structure and CI script.
- Security baseline: good desktop-local baseline (strict CSP, capability minimization, path checks, sensitive key rejection, deterministic ASR status checks).
- Thread/async/memory model: practical and mostly safe for desktop workloads.
- Maintainability: good due to typed IPC contracts, migration discipline, and guard-rail scripts.

### Main strengths

- Clear Rust topology: `commands` -> `domain` -> `platform` + `kernel`.
- End-to-end typed IPC contract discipline (Rust serde + UI Zod schemas + usage).
- DB reliability posture with migrations, continuity checks, snapshots, and recovery.
- Recorder pipeline designed for stable low-latency desktop behavior.
- CI enforces structure, tests, and DB reliability scenarios.

### Main risks / improvement priorities

- `commands/audio.rs` and `commands/transcription.rs` are large orchestration hotspots in command layer.
- No cryptographic tamper-proofing of local DB/content (integrity checks detect corruption, not malicious edits).
- Live/final ASR flow is robust, but still mostly thread-based orchestration; deeper cancellation/job-control could be improved.
- "SOTA-first" is partially true (modern local design), but model lineup (`tiny`, `base`) is pragmatic, not frontier-SOTA.

## 3. High-level architecture

### Stack

- Shell/runtime: Tauri v2
- Backend: Rust (`rusqlite`, `cpal`, sidecar orchestration)
- UI: Vue 3 + TypeScript + Vite + Vue Router + Nuxt UI + Tailwind
- Storage: SQLite (`global.db` + per-profile `profile.db`) + filesystem artifacts
- Speech: local whisper.cpp sidecar (`desktop/asr-sidecar`, bundled at packaging)

### Layer model (Rust)

- `commands/`: Tauri IPC entrypoints (public backend boundary)
- `domain/`: use-case and business logic by bounded context
- `platform/`: DB/filesystem/sidecar/preferences infrastructure
- `kernel/`: shared primitives and canonical models

### Bounded contexts present

- Workspace/profiles
- Talk project + outline
- Training/quests
- Runs (boss-run workflow)
- Feedback + notes + timeline
- Exchange (pack export/import + peer review)
- Recorder/audio DSP/VAD
- ASR/transcription/models/diagnostics
- Coach/progress/blueprint/mascot
- Preferences

## 4. Directory structure (practical map)

```text
desktop/
  src-tauri/
    src/
      commands/         # Tauri command wrappers
      domain/           # business contexts
      platform/         # sqlite/fs/sidecar/preferences
      kernel/           # ids/time/models
    capabilities/
      default.json      # IPC capability scope
    tauri.conf.json     # app config, CSP, resources
    sidecar/            # packaged sidecar filenames
  ui/
    src/
      domains/          # per-domain API adapters (invokeChecked)
      schemas/          # zod IPC schemas + event schemas
      stores/           # app orchestration store
      pages/            # route-level workflows
      components/       # UI components
      lib/              # pure logic helpers (tested)

migrations/
  global/0001_init.sql
  profile/0001_init.sql

seed/
  quests.v1.json
```

## 5. Use-cases currently implemented

The app already handles a full local rehearsal lifecycle:

- Profile/workspace lifecycle:
  - Create/list/switch/rename/delete profiles
- Talk lifecycle:
  - Create/update/list/set active project
  - Ensure special training project
  - Outline get/set/export
- Training quest lifecycle:
  - Daily quest and catalog retrieval
  - Text and audio quest submissions
  - Attempts list and report
- Run lifecycle:
  - Create run, attach audio, attach transcript
  - List/get latest/get by id
  - Analyze run into feedback
- Feedback lifecycle:
  - Analyze quest attempt
  - Load feedback payload
  - Load feedback context (quest/run)
  - Timeline list + note set/get
- Recorder workflow:
  - Start/pause/resume/stop recording
  - Device selection
  - Telemetry and waveform stream
  - Trim wav and reveal in file manager
- ASR workflow:
  - Sidecar compatibility status
  - Model list/download/verify/remove
  - Offline transcription
  - Transcript edit/export
  - Diagnostics export
- Exchange workflow:
  - Pack export (audio/transcript/outline/rubric/review template/viewer)
  - Pack inspect
  - Peer review import and peer review retrieval

## 6. Vue <-> Tauri <-> Rust communication model

### Command path

1. Vue page/component calls domain API (`desktop/ui/src/domains/*/api.ts`).
2. Domain API calls `invokeChecked(...)`.
3. `invokeChecked` validates payload with Zod, calls Tauri `invoke`, validates response with Zod.
4. Tauri command (`#[tauri::command]`) delegates to domain/platform functions.
5. Result returns through the same typed path.

This is a clean "typed adapter" pattern at IPC boundary.

### Event path

Rust emits events with `app.emit(...)`, UI listens with `listen(...)`.

Main event channels:

- `recording/telemetry/v1`
- `asr/partial/v1`
- `asr/commit/v1`
- `asr/final_progress/v1`
- `asr/final_result/v1`
- `asr/model_download_progress/v1`
- `job:progress`
- `job:completed`
- `job:failed`

Each event payload has matching Zod schema in UI (`schemas/ipc.ts`), and parsing is explicit in listeners.

## 7. How the Tauri backend functions

### Command registration

- Centralized in `desktop/src-tauri/src/lib.rs` via `tauri::generate_handler!`.
- Debug build registers security probe commands; release build omits those debug-only commands.

### Core runtime concerns

- Audio capture uses `cpal` input stream with dedicated recorder thread.
- ASR final transcription jobs run via `tauri::async_runtime::spawn_blocking`.
- Live ASR and telemetry use separate threads and channels.
- Global/session state is guarded by `Mutex` and explicit session controller structs.

## 8. Domain separation and SQL separation audit

### Domain separation

Good:

- Most command files are thin wrappers to domain modules.
- Domain submodules split read/write/repo/query concerns.
- Cross-cutting concerns (`artifacts`, `db`, `asr_sidecar`, `preferences`) are in `platform`.

Needs improvement:

- `commands/audio.rs` and `commands/transcription.rs` still hold heavy orchestration logic and should be further decomposed into domain services.

### SQL separation

Good:

- SQL is mostly in repo/query modules (`domain/*/repo`, `queries.rs`) and platform DB modules.
- CI has `scripts/check-domain-structure.sh` guard forbidding SQL in migrated command wrappers.
- Query constants are used in some modules (`domain/run/queries.rs`) for readability and reuse.

Residual issues:

- SQL in platform modules is expected (migrations/db/helpers), but this increases concentration in `platform/db.rs`; maintain strict tests as currently done.

## 9. Data model and data exchange contracts

### Storage model

- `global.db`:
  - `profiles`, `global_settings`
- `profile.db`:
  - `talk_projects`, `talk_outlines`, `quests`, `active_state`, `quest_attempts`, `runs`,
  - `artifacts`, `auto_feedback`, `feedback_notes`, `peer_reviews`,
  - `profile_settings`, and legacy sync tables.

Artifacts are files on disk with metadata rows in `artifacts` table (type, relpath, sha256, bytes, metadata_json).

### IPC contract quality

Strong:

- UI schemas encode payload and response contracts for all commands and events.
- Sensitive preference key fragments blocked in both UI and Rust validation.
- Error mapping in UI is normalized (`IPC_INVALID_PAYLOAD`, `IPC_COMMAND_FAILED`, `IPC_INVALID_RESPONSE`).

## 10. Security posture

### Positive controls

- Strict CSP in `tauri.conf.json` (production `connect-src ipc:`).
- Minimal capability file (`core`, dialog open, shell open).
- Path traversal protection via canonicalization and app-data-root checks.
- Artifact path read restrictions (`artifact_path_not_allowed` guard).
- Sidecar doctor protocol/capability compatibility checks.
- Preference keys reject sensitive fragments.
- DB diagnostics payload intentionally metadata-only.
- Debug-only security probe commands not exposed in release registration.

### Local DB tampering clarification

- Current model is local-first and assumes local filesystem ownership.
- The system detects corruption/inconsistency (`quick_check`, `integrity_check`, FK checks, migration continuity) and can recover from snapshots.
- It does not cryptographically prevent a privileged local user from editing SQLite/artifact files.

Bad-case behavior if tampering/corruption occurs:

- Runtime open/prepare fails or integrity checks fail.
- DB is quarantined under `corrupted/`.
- Latest snapshot restore attempted from `backups/`.
- If no snapshot exists: deterministic error (`db_recovery_no_snapshot`).

## 11. Recorder architecture (functional path)

Recorder flow:

1. UI calls `recording_start(profileId, asrSettings, inputDeviceId)`.
2. Rust validates profile, creates artifact draft path, spawns recording thread.
3. Input stream callback:
   - Converts channels to mono,
   - computes RMS,
   - resamples to 16 kHz,
   - writes PCM16 WAV,
   - applies AGC,
   - updates VAD and quality signals,
   - pushes samples into ring buffer.
4. Parallel threads:
   - Live ASR decode thread emits partial/commit text events.
   - Telemetry thread emits quality + waveform events.
5. `recording_stop` finalizes WAV + artifact metadata and returns artifact id/path/hash/size/duration.

This is a pragmatic desktop design: bounded memory ring buffer, explicit threads, low IPC telemetry cadence, and no raw PCM streaming over IPC.

## 12. Memory, thread, and async optimization audit

### Strengths

- Audio callback path is lightweight and lock scope is bounded.
- Ring buffer bounds memory for live analysis windows.
- `spawn_blocking` isolates heavy transcription/model download work.
- Telemetry loop uses fixed interval and capped payload intent.

### Watchpoints

- Large command files increase cognitive and maintenance load around concurrency behavior.
- Sidecar decode uses base64 payload windows, which adds CPU/memory overhead.
- Cancellation and job lifecycle control for long ASR jobs can be made more explicit.

## 13. Cross-platform readiness

- macOS microphone permission declared (`Info.plist`).
- Windows/macOS/Linux reveal behavior handled per OS (`open -R`, `explorer`, `xdg-open`).
- Sidecar candidate path strategy supports packaged and dev modes.
- CI includes macOS + Windows recorder smoke and ASR smoke flows.

## 14. Enterprise-first, local-first, SOTA-first: why this codebase fits (and limits)

### Enterprise-first (true, mostly)

- Deterministic migrations and continuity checks.
- Reliability and structural gates in CI.
- Typed contracts and explicit error codes.
- Release workflows include signing/notarization verification gates.
- Operational diagnostics and runbook-oriented checks.

### Local-first (true)

- Core workflows run fully offline.
- Audio/transcript/feedback artifacts stored locally.
- No mandatory cloud account/service path in main rehearsal loop.

### SOTA-first (partially true, pragmatic)

- Modern local ASR architecture (sidecar protocol checks, model integrity, live/final modes).
- But model catalog (`tiny`, `base`) prioritizes portability and speed over best-possible accuracy.
- This is intentional pragmatic SOTA-in-practice for consumer desktops.

## 15. Maintainability assessment

Why maintainable now:

- Bounded contexts are explicit in both Rust and UI.
- IPC schemas and adapters are centralized and testable.
- CI guard rails protect architecture drift.
- Domain logic has dedicated small modules and unit tests in many hotspots.

Current maintainability debt:

- Two high-size command orchestration files (`audio`, `transcription`).
- App store file remains a broad orchestrator surface in UI.

## 16. Recommended future implementation plan

1. Extract audio/transcription orchestration from `commands/*` into `domain/recorder` and `domain/asr` service modules.
2. Add explicit cancellable job manager for transcription/download long-running tasks.
3. Introduce signed integrity manifests for critical local artifacts if tamper-evidence is required.
4. Continue SQL modularization toward table-owned query modules only.
5. Add Linux release smoke path (not only CI build assumptions) for parity with macOS/Windows.
6. Add performance budgets in CI for recorder callback latency and ASR end-to-end decode windows.
7. Expand ASR model strategy (quality tiers + hardware-aware defaults) while preserving local-first guarantees.

## 17. Final verdict

The codebase is already structured as a serious local desktop product with strong architectural discipline, robust IPC contracts, and practical reliability/security controls. It is enterprise-grade in process and boundaries, local-first by design, and pragmatically modern in ASR/recorder implementation. The next major quality step is reducing orchestration hotspots and formalizing tamper-evidence and job-control depth.
