# PLAN-DOMAIN-CODE-ALIGNMENT

Status: in_progress
Owner: maintainers
Last updated: 2026-03-01

## Objective

Align repository structure with product bounded contexts so code reads by use-case first, framework second.

## Full bounded-context map

1. Workspace
- Profiles, active workspace, workspace-scoped preferences, diagnostics entrypoints.

1. Talk
- Talk lifecycle, metadata, stage transitions, outline/builder.

1. Training
- Quest selection, submissions, progression and readiness guards.

1. Run
- Boss run lifecycle, run persistence, transcript binding.

1. Feedback
- Analysis generation, feedback context/timeline/notes.

1. Exchange
- Pack export/import, peer review payloads.

1. Recorder
- Capture lifecycle, input devices, pause/resume/stop, telemetry, waveform payloads, trim/reveal.

1. ASR
- Sidecar lifecycle, model management, live/final transcription, transcript export.

1. Platform
- Preferences persistence policy, security probes, release/runtime wiring.

## Primary rule (architecture)

Rust backend topology is now:
- `commands/`: thin IPC entrypoints (validation + orchestration only).
- `domain/`: product bounded contexts only.
- `platform/`: concrete adapters (sqlite/fs/sidecar/security/preferences/runtime).
- `kernel/`: tiny shared primitives (ids/time/errors/contracts).

## Target topology (incremental)

Rust (`desktop/src-tauri/src`)
- `commands/`
  - thin command entrypoints only.
- `domain/<context>/`
  - one folder per product bounded context (`workspace`, `talk`, `training`, `run`, `feedback`, `exchange`, `recorder`, `asr`, `coach`).
  - internal split by responsibility (`mod.rs`, `service.rs` or `mod.rs`, `repo.rs`, `queries.rs`, `types.rs`).
- `platform/<capability>/`
  - runtime and infrastructure adapters (`db`, `preferences`, `security`, sidecar/process, filesystem/artifacts).
- `kernel/`
  - cross-cutting primitives reused by domain/platform.

UI (`desktop/ui/src`)
- `domains/<context>/`
  - `api/` IPC adapters (schema-aware).
  - `state/` context stores/composables.
  - `ui/` context components.
- `app/` shell, router composition, cross-domain wiring.
- Keep `lib/` only for truly cross-domain pure utilities.

## Guard rails (enforced)

1. Dependency direction
- Rust `domain`, `platform`, and `kernel` must not depend on `commands`.
- Legacy `crate::core::*` imports are forbidden.
- Legacy `desktop/src-tauri/src/core` path must stay absent.
- Migrated command wrappers must not contain direct DB/SQL logic.
- UI domain APIs must not import `stores`, `pages`, or `components`.

1. Hotspot size budgets
- Existing migrated wrapper budgets stay enforced.
- Active hotspot budgets now include:
  - `desktop/src-tauri/src/commands/audio.rs`
  - `desktop/src-tauri/src/commands/transcription.rs`
  - `desktop/ui/src/components/AudioRecorder.vue`
  - `desktop/ui/src/domains/recorder/api.ts`
  - `desktop/ui/src/domains/asr/api.ts`

## Migration strategy

1. Freeze boundary rules first
- Keep command/page layers orchestration-only.
- Keep domain logic free of UI framework and IPC concerns.
- Keep platform adapter concerns out of command wrappers.

1. Extract by vertical slices
- Keep behavior unchanged per slice.
- Prefer small reversible pull requests.

1. Prioritized sequence
- Completed (legacy path extraction): workspace, training/quest, feedback, talk, exchange, recorder/ASR runtime extractions.
- Completed (topology migration): domain contexts moved outside `core/`, platform/kernel split completed, and `core/` removed.
- Next:
  - split large context modules into smaller submodules (`service`, `repo`, `queries`, `types`) where readability gains are clear,
  - keep command wrappers thin while maintaining IPC schema stability,
  - enforce drift-prevention guardrails in CI.

1. Keep IPC contract stability during refactor
- Preserve command names and event channels where possible.
- Any field/name change updates Rust serde + Zod schemas + UI usage in the same PR.

## Progress updates

- 2026-02-28: Workspace slice completed.
  - Rust: `commands/profile.rs` reduced to thin command entrypoints; workspace behavior moved to `core/workspace.rs`.
  - UI: workspace profile IPC calls extracted to `ui/src/domains/workspace/api.ts`; `stores/app.ts` consumes this boundary.

- 2026-02-28: Training/quest slice completed.
  - Rust: `commands/quest.rs` reduced to thin command entrypoints; quest behavior moved to `core/quest.rs`.
  - UI: quest IPC calls extracted to `ui/src/domains/quest/api.ts`; `stores/app.ts` consumes this boundary.

- 2026-02-28: Feedback slice completed.
  - Rust: `commands/feedback.rs` reduced to thin command entrypoints; feedback behavior moved to `core/feedback.rs`.
  - UI: feedback IPC calls extracted to `ui/src/domains/feedback/api.ts`; `stores/app.ts` consumes this boundary.

- 2026-02-28: Talk slice completed.
  - Rust: `commands/project.rs` and `commands/outline.rs` reduced to thin command entrypoints; talk behavior moved to `core/project.rs` and `core/outline.rs`.
  - UI: talk IPC calls extracted to `ui/src/domains/talk/api.ts`; `stores/app.ts` consumes this boundary.

- 2026-02-28: Exchange slice completed.
  - Rust: `commands/pack.rs` and `commands/peer_review.rs` reduced to thin command entrypoints; exchange behavior moved to `core/pack.rs` and `core/peer_review.rs`.
  - UI: pack/review IPC calls extracted to `ui/src/domains/pack/api.ts`; `stores/app.ts` consumes this boundary.

- 2026-02-28: Structural guard rails added.
  - Added `scripts/check-domain-structure.sh` with dependency-direction checks and file-size budgets.
  - CI now enforces this guard rail on each run.

- 2026-03-01: Recorder + ASR UI boundary slice completed.
  - UI: recorder IPC calls extracted to `ui/src/domains/recorder/api.ts`.
  - UI: ASR/transcript IPC calls extracted to `ui/src/domains/asr/api.ts`.
  - UI: `AudioRecorder.vue` now consumes recorder/ASR domain APIs instead of direct IPC command calls.
  - Guard rails: domain-structure size budgets updated for recorder/ASR hotspot files.

- 2026-03-01: ASR backend extraction (transcription runtime) completed.
  - Rust: extracted transcription ASR settings normalization and final decode pipeline from `commands/transcription.rs` into `core/asr.rs`.
  - Rust: `commands/transcription.rs` now delegates WAV decode + sidecar decode orchestration to `core/asr`.
  - Tests: existing transcription decode contract tests remain green against `core/asr` implementation.

- 2026-03-01: ASR backend extraction (model download service) completed.
  - Rust: extracted ASR model download/checksum/manifest write flow from `commands/transcription.rs` into `core/asr.rs`.
  - Rust: `commands/transcription.rs` now delegates download execution to `core/asr` and keeps event emission in the command wrapper.

- 2026-03-01: ASR backend extraction (diagnostics bundle builder) completed.
  - Rust: moved ASR diagnostics bundle composition/path-redaction logic from `commands/transcription.rs` into `core/asr.rs`.
  - Rust: `commands/transcription.rs` now delegates diagnostics payload construction to `core/asr`.

- 2026-03-01: Transcript domain extraction (edit metadata builder) completed.
  - Rust: moved transcript edit metadata construction from `commands/transcription.rs` to `core/transcript.rs`.
  - Rust: `commands/transcription.rs` now delegates this concern to transcript domain helpers.

- 2026-03-01: Recorder backend extraction (trim codec utilities) completed.
  - Rust: extracted WAV trim/decode/encode/range helpers from `commands/audio.rs` into `core/recorder.rs`.
  - Rust: `commands/audio.rs` now delegates trim codec/range operations to `core/recorder`.
  - Tests: trim/decode utility tests moved to `core/recorder` module tests.

- 2026-03-01: Recorder backend extraction (input device services) completed.
  - Rust: moved input-device listing/selection/id-building from `commands/audio.rs` into `core/recorder.rs`.
  - Rust: `commands/audio.rs` now delegates mic device resolution/listing to recorder domain services.

- 2026-03-01: Recorder ASR runtime extraction (settings + sidecar spawn) completed.
  - Rust: moved recording-side ASR settings normalization and sidecar spawn logic from `commands/audio.rs` into `core/asr.rs`.
  - Rust: `commands/audio.rs` now consumes `core/asr` for recorder ASR runtime configuration/spawn concerns.

- 2026-03-01: Recorder ASR runtime extraction (live decode strategy) completed.
  - Rust: moved live decoder strategy types (`LiveDecoder`, `SidecarLiveDecoder`, `MockAsrDecoder`) from `commands/audio.rs` into `core/asr.rs`.
  - Rust: moved live sidecar benchmark helper from `commands/audio.rs` into `core/asr.rs`.
  - Rust: `commands/audio.rs` now delegates live ASR decode runtime behavior to `core/asr` abstractions.

- 2026-03-01: Topology reset started (`domain/`, `platform/`, `kernel` as primary rule).
  - Rule: new backend code must target `domain/`, `platform/`, or `kernel` (not legacy `core/`).
  - Rust: moved `run` and `coach` contexts from `core/` to `domain/`.
  - Rust: moved `preferences` from `core/` to `platform/`.
  - Rust: command wrappers now import the new module locations (`commands/run.rs`, `commands/coach.rs`, `commands/preferences.rs`).
  - Rust: added temporary `core` compatibility re-exports to keep migration incremental.

- 2026-03-01: Topology reset continued (workspace context).
  - Rust: moved `workspace` context from `core/workspace.rs` to `domain/workspace/mod.rs`.
  - Rust: `commands/profile.rs` now imports `domain::workspace` and `platform::db`.
  - Guard rails: legacy path checks now enforce removal of `core/workspace.rs`.

- 2026-03-01: Topology reset continued (talk context).
  - Rust: moved `project` and `outline` contexts from `core/` to `domain/talk/`.
  - Rust: `commands/project.rs` and `commands/outline.rs` now import `domain::talk::*`.
  - Guard rails: legacy path checks now enforce removal of `core/project.rs` and `core/outline.rs`.

- 2026-03-01: Topology reset continued (feedback context).
  - Rust: moved `feedback` context from `core/feedback.rs` to `domain/feedback/mod.rs`.
  - Rust: `commands/feedback.rs` now imports `domain::feedback`.
  - Guard rails: legacy path checks now enforce removal of `core/feedback.rs`.

- 2026-03-01: Topology reset continued (training/quest context).
  - Rust: moved `quest` context from `core/quest.rs` to `domain/training/quest.rs`.
  - Rust: `commands/quest.rs` now imports `domain::training::quest`.
  - Guard rails: legacy path checks now enforce removal of `core/quest.rs`.

- 2026-03-01: Topology reset continued (exchange context).
  - Rust: moved `pack` and `peer_review` contexts from `core/` to `domain/exchange/`.
  - Rust: `commands/pack.rs` and `commands/peer_review.rs` now import `domain::exchange::*`.
  - Guard rails: legacy path checks now enforce removal of `core/pack.rs` and `core/peer_review.rs`.

- 2026-03-01: Topology reset continued (recorder context).
  - Rust: moved `recorder` and `recording` modules from `core/` to `domain/recorder/`.
  - Rust: `commands/audio.rs` now imports `domain::recorder` and `domain::recorder::recording`.
  - Guard rails: legacy path checks now enforce removal of `core/recorder.rs` and `core/recording.rs`.

- 2026-03-01: Topology reset continued (kernel primitives).
  - Rust: moved `ids` and `time` primitive implementations from `core/` to `kernel/`.
  - Rust: `core::ids` and `core::time` are now compatibility re-exports to `kernel::*`.
  - Guard rails: legacy path checks now enforce removal of `core/ids.rs` and `core/time.rs`.

- 2026-03-01: Topology reset continued (ASR domain modules).
  - Rust: moved `asr`, `asr_live`, and `asr_models` from `core/` to `domain/asr/`.
  - Rust: `commands/audio.rs` and `commands/transcription.rs` now import `domain::asr` modules directly.
  - Guard rails: legacy path checks now enforce removal of `core/asr.rs`, `core/asr_live.rs`, and `core/asr_models.rs`.

- 2026-03-01: Topology reset continued (platform infrastructure modules).
  - Rust: moved `db`, `db_helpers`, `seed`, and `asr_sidecar` from `core/` to `platform/`.
  - Rust: `commands/audio.rs` and `commands/transcription.rs` now import `platform::db` and `platform::asr_sidecar`.
  - Guard rails: legacy path checks now enforce removal of `core/db.rs`, `core/db_helpers.rs`, `core/seed.rs`, and `core/asr_sidecar.rs`.

- 2026-03-01: Topology reset continued (feedback analysis engine).
  - Rust: moved feedback analysis/scoring logic from `core/analysis.rs` to `domain/feedback/analysis.rs`.
  - Rust: `domain/run` and `domain/feedback` now consume feedback analysis via domain path imports.
  - Guard rails: legacy path checks now enforce removal of `core/analysis.rs`.

- 2026-03-01: Topology reset continued (recorder signal processing).
  - Rust: moved `dsp` and `vad` modules from `core/` to `domain/recorder/`.
  - Rust: `commands/audio.rs` now imports recorder signal processing modules from `domain::recorder`.
  - Guard rails: legacy path checks now enforce removal of `core/dsp.rs` and `core/vad.rs`.

- 2026-03-01: Topology reset continued (transcript module).
  - Rust: moved transcript processing/export/edit helpers from `core/transcript.rs` to `domain/asr/transcript.rs`.
  - Rust: `commands/transcription.rs`, `domain/feedback`, `domain/run`, and `domain/exchange` now import transcript helpers from `domain::asr::transcript`.
  - Guard rails: legacy path checks now enforce removal of `core/transcript.rs`.

- 2026-03-01: Topology reset continued (artifact infrastructure module).
  - Rust: moved artifact storage/retrieval helpers from `core/artifacts.rs` to `platform/artifacts.rs`.
  - Rust: command/domain callers now import artifact helpers from `platform::artifacts`.
  - Guard rails: legacy path checks now enforce removal of `core/artifacts.rs`.

- 2026-03-01: Topology reset continued (shared model contracts).
  - Rust: moved shared data contracts from `core/models.rs` to `kernel/models.rs`.
  - Rust: `core::models` is now a compatibility re-export to `kernel::models`.
  - Guard rails: legacy path checks now enforce removal of `core/models.rs`.

- 2026-03-01: Topology reset milestone reached (`core/` reduced to compatibility facade).
  - Rust: removed remaining implementation modules under `core/` (`artifacts`, `models`, `transcript`, `db`, `asr_sidecar`, etc.) by relocating them into `domain/`, `platform/`, and `kernel/`.
  - Structure: `desktop/src-tauri/src/core/` now contains only `mod.rs` compatibility re-exports.

- 2026-03-01: Topology reset completed (`core/` removed).
  - Rust: removed `desktop/src-tauri/src/core/mod.rs` and `pub mod core` from crate root.
  - Rust: replaced all remaining `crate::core::*` imports with direct `kernel`/`domain`/`platform` imports.
  - Guard rails: `scripts/check-domain-structure.sh` now forbids legacy `crate::core::*` imports and enforces absence of `desktop/src-tauri/src/core`.

- 2026-03-01: Domain decomposition continued (training/quest split into smaller files).
  - Rust: replaced `domain/training/quest.rs` with `domain/training/quest/{mod.rs,repo.rs,types.rs}`.
  - Structure: public API stays unchanged while SQL-heavy persistence logic is isolated in `repo.rs`.
  - Goal: keep domain files small and easier to navigate for humans and AI coding agents.

- 2026-03-01: Domain decomposition continued (workspace split into smaller files).
  - Rust: replaced monolithic `domain/workspace/mod.rs` internals with `domain/workspace/{mod.rs,repo.rs}`.
  - Structure: `mod.rs` now owns orchestration and filesystem boundaries; SQL transactions and profile queries are isolated in `repo.rs`.
  - Goal: keep bounded-context modules small and enforce a consistent service/repository layout.

- 2026-03-01: Domain decomposition continued (talk/project split into smaller files).
  - Rust: replaced `domain/talk/project.rs` with `domain/talk/project/{mod.rs,repo.rs,types.rs}`.
  - Structure: business orchestration/validation remains in `mod.rs`, while SQL persistence and projection queries move to `repo.rs`.
  - Goal: keep talk context evolvable with smaller, role-focused files.

- 2026-03-01: Domain decomposition continued (feedback split into smaller files).
  - Rust: replaced monolithic `domain/feedback/mod.rs` internals with `domain/feedback/{mod.rs,repo.rs,types.rs}` plus existing `analysis.rs`.
  - Structure: feedback orchestration/artifact handling remains in `mod.rs`; SQL lookups and transactions are isolated in `repo.rs`.
  - Goal: keep feedback context readable with small, role-focused files and explicit boundaries.

- 2026-03-01: Domain decomposition continued (coach split by use-case modules).
  - Rust: replaced monolithic `domain/coach/mod.rs` internals with `domain/coach/{mod.rs,progress.rs,blueprint.rs,mascot.rs}`.
  - Structure: `mod.rs` now exposes thin entrypoints; progress math, blueprint generation, and mascot message logic live in dedicated files.
  - Goal: make coach behavior easier to evolve with feature-oriented, small files.

- 2026-03-01: Domain decomposition continued (ASR settings split).
  - Rust: extracted ASR settings payload/runtime models and normalization logic from `domain/asr/mod.rs` into `domain/asr/settings.rs`.
  - Structure: `domain/asr/mod.rs` now re-exports settings APIs while keeping callers unchanged.
  - Goal: progressively reduce ASR module size with safe, behavior-preserving slices.

- 2026-03-01: Domain decomposition continued (ASR diagnostics split).
  - Rust: extracted diagnostics contracts and bundle composition from `domain/asr/mod.rs` into `domain/asr/diagnostics.rs`.
  - Structure: diagnostics API is re-exported from `domain/asr/mod.rs`; callers remain unchanged.
  - Goal: isolate diagnostics concerns from core ASR decode/download runtime.

- 2026-03-01: Domain decomposition continued (ASR downloader split).
  - Rust: extracted model download/checksum/finalize flow from `domain/asr/mod.rs` into `domain/asr/downloader.rs`.
  - Structure: `download_model_blocking` is re-exported from `domain/asr/mod.rs`; command call sites remain unchanged.
  - Goal: isolate external I/O heavy download logic from ASR decode/runtime core.

- 2026-03-01: Domain decomposition continued (ASR live decoder split).
  - Rust: extracted live decode strategy types and benchmark helper from `domain/asr/mod.rs` into `domain/asr/live_decoder.rs`.
  - Structure: `LiveDecoder`, `SidecarLiveDecoder`, `MockAsrDecoder`, and `benchmark_live_sidecar` are re-exported from `domain/asr/mod.rs`.
  - Goal: isolate live ASR strategy behavior from core ASR orchestration.

- 2026-03-01: Domain decomposition continued (ASR transcript split).
  - Rust: replaced monolithic `domain/asr/transcript.rs` with `domain/asr/transcript/{mod.rs,io.rs,edit.rs,format.rs,punctuation.rs}`.
  - Structure: transcript I/O, edit metadata/rewrite, export formatting, and spoken punctuation rules are now isolated by concern and re-exported from `transcript/mod.rs`.
  - Goal: keep transcript-domain files small and navigable while preserving existing command/domain call sites.

- 2026-03-01: Domain decomposition continued (exchange pack repository split).
  - Rust: extracted SQL/persistence and DB query helpers from `domain/exchange/pack.rs` into `domain/exchange/pack/repo.rs`.
  - Structure: `pack.rs` keeps export/inspect/import orchestration and zip validation, while `pack/repo.rs` owns artifact/outline lookups and peer-review import transaction writes.
  - Goal: isolate DB responsibilities behind a dedicated submodule and keep pack orchestration easier to navigate.

- 2026-03-01: Domain decomposition continued (exchange pack archive split).
  - Rust: extracted zip/hash/file I/O helpers from `domain/exchange/pack.rs` into `domain/exchange/pack/archive.rs`.
  - Structure: `pack.rs` now keeps high-level export/inspect/import flow, while `pack/archive.rs` centralizes zip entry validation, content reads, artifact writes, and SHA checks.
  - Goal: isolate archive-specific mechanics from domain orchestration to keep small, purpose-focused files.

- 2026-03-01: Domain decomposition continued (exchange pack types/content split).
  - Rust: extracted pack manifest/file-entry contracts to `domain/exchange/pack/types.rs` and rubric/viewer content builders to `domain/exchange/pack/content.rs`.
  - Structure: `pack.rs` now wires typed contracts and content builders while keeping orchestration readable; low-level contract/content details live in dedicated modules.
  - Goal: keep files smaller and role-oriented for easier onboarding and AI-assisted edits.

- 2026-03-01: Domain decomposition continued (exchange pack inspect split).
  - Rust: extracted `pack_inspect` flow and inspect DTOs into `domain/exchange/pack/inspect.rs`.
  - Structure: `pack.rs` now re-exports inspect API while retaining export/import orchestration; inspect-only zip validation and summary shaping are isolated in a dedicated module.
  - Goal: separate import/export paths from inspect path for clearer bounded responsibilities and smaller files.

- 2026-03-01: Domain decomposition continued (exchange pack import split).
  - Rust: extracted `peer_review_import` flow and response contract into `domain/exchange/pack/import.rs`.
  - Structure: `pack.rs` now re-exports import API and keeps export orchestration plus shared artifact-path helper; import-side zip parsing, artifact writes, and transactional persistence orchestration are isolated.
  - Goal: separate import and export use-cases into dedicated modules for cleaner bounded-context navigation.

- 2026-03-01: Domain decomposition continued (workspace repository split).
  - Rust: split `domain/workspace/repo.rs` internals into `domain/workspace/repo/{queries.rs,mutations.rs}` with a small `repo.rs` facade re-exporting the same API.
  - Structure: profile listing/read counters live in `queries.rs`; profile create/switch/delete/rename transactional writes (and rollback tests) live in `mutations.rs`.
  - Goal: keep workspace persistence code small and role-focused while preserving existing domain call sites.

- 2026-03-01: Domain decomposition continued (recorder recording runtime split).
  - Rust: split `domain/recorder/recording.rs` internals into `domain/recorder/recording/{ring_buffer.rs,resampler.rs,wav_writer.rs}` with a small facade re-exporting the same types.
  - Structure: circular sample buffering, linear resampling, and WAV stream writing are now isolated in dedicated modules with focused tests per concern.
  - Goal: keep recorder runtime internals easier to navigate and safer to evolve in small slices.

- 2026-03-01: Domain decomposition continued (training quest repository split).
  - Rust: split `domain/training/quest/repo.rs` internals into `domain/training/quest/repo/{queries.rs,writes.rs}` with a small facade preserving current exports.
  - Structure: read-side quest/attempt/report queries and row mapping live in `queries.rs`; attempt insert/update and quest existence checks live in `writes.rs`.
  - Goal: keep quest persistence logic role-oriented and easier to evolve without growing one SQL monolith file.

- 2026-03-01: Domain decomposition continued (talk project repository split).
  - Rust: split `domain/talk/project/repo.rs` internals into `domain/talk/project/repo/{queries.rs,writes.rs}` with a small facade preserving current exports.
  - Structure: read-side project fetch/list/active/training-state queries live in `queries.rs`; create/update/active-state writes live in `writes.rs`.
  - Goal: keep talk project persistence code role-focused and reduce monolithic repository growth.

- 2026-03-01: Domain decomposition continued (ASR transcript punctuation rules split).
  - Rust: extracted spoken punctuation rule contracts and language dictionaries from `domain/asr/transcript/punctuation.rs` into `domain/asr/transcript/punctuation_rules.rs`.
  - Structure: `punctuation.rs` now focuses on token matching and text rewriting flow; `punctuation_rules.rs` owns rule data and language selection.
  - Goal: isolate large static rule dictionaries from processing logic to keep files smaller and edits safer.

- 2026-03-01: Domain decomposition continued (exchange pack repository internals split).
  - Rust: split `domain/exchange/pack/repo.rs` internals into `domain/exchange/pack/repo/{lookups.rs,import_persistence.rs}` with a small facade preserving current exports.
  - Structure: artifact/outline/talk-number lookup helpers live in `lookups.rs`; peer-review import transactional write graph (with rollback tests) lives in `import_persistence.rs`.
  - Goal: keep exchange repository internals role-focused and easier to evolve without growing a single SQL-heavy file.

- 2026-03-01: Domain decomposition continued (coach blueprint split).
  - Rust: replaced `domain/coach/blueprint.rs` with `domain/coach/blueprint/{mod.rs,framework.rs,steps.rs}`.
  - Structure: `mod.rs` now keeps blueprint orchestration and completion math, `framework.rs` owns framework selection heuristics, and `steps.rs` owns localized step construction.
  - Goal: keep coach blueprint logic small and intention-revealing for future feature evolution.

- 2026-03-01: Domain decomposition continued (coach mascot split).
  - Rust: replaced `domain/coach/mascot.rs` with `domain/coach/mascot/{mod.rs,routes.rs}`.
  - Structure: `mod.rs` now handles route-based selection and gating conditions, while `routes.rs` owns localized message payload construction per route/context.
  - Goal: isolate decision flow from copy payload generation to keep mascot behavior easier to evolve and review.

- 2026-03-01: Domain decomposition continued (ASR models split).
  - Rust: replaced `domain/asr/asr_models.rs` with `domain/asr/asr_models/{mod.rs,specs.rs,integrity.rs}`.
  - Structure: `mod.rs` keeps high-level model status/list/verify orchestration; `specs.rs` owns model catalog definitions and lookup helpers; `integrity.rs` owns manifest serialization and checksum routines.
  - Goal: isolate static model catalog data and integrity internals from orchestration logic to keep ASR model management easier to evolve.

- 2026-03-01: Domain decomposition continued (feedback service split).
  - Rust: replaced monolithic `domain/feedback/mod.rs` internals with `domain/feedback/{mod.rs,timeline.rs,analyze.rs,context.rs,notes.rs}`.
  - Structure: timeline listing, analyze flow, feedback context/file loading, and notes upsert/get/delete are now isolated into dedicated modules while `mod.rs` stays a small API facade.
  - Goal: keep feedback domain use-cases small and feature-oriented with stable command-facing API.

- 2026-03-01: Domain decomposition continued (feedback repository internals split).
  - Rust: split `domain/feedback/repo.rs` internals into `domain/feedback/repo/{queries.rs,mutations.rs}` with a small facade preserving current exports.
  - Structure: read-side lookup/timeline/note queries live in `queries.rs`; note upsert/delete and attempt-feedback persistence transaction writes live in `mutations.rs`.
  - Goal: keep feedback persistence internals role-focused and easier to evolve without one SQL-heavy repository file.

## Acceptance criteria

- New code lands in context modules by default.
- Domain use-cases are traceable from route/command to domain service to storage adapter.
- Monolithic files are reduced and bounded by orchestration role.
- Architecture docs stay aligned with real topology.

## Exit criteria

This plan is complete when:
- `domain/`, `platform/`, and `kernel/` are the only active backend layers (besides `commands/`),
- legacy `core/` path is removed,
- enforced guard rails prevent drift back to mixed monolith patterns.
