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

## Target topology (incremental)

Rust (`desktop/src-tauri/src`)
- `commands/`
  - thin command entrypoints only (validation + orchestration).
- `core/`
  - domain services by bounded context (`workspace`, `talk`, `training`, `run`, `feedback`, `exchange`, `recorder`, `asr`, `platform`).
  - DB/data adapters by domain (`repo.rs`, `queries.rs`, `types.rs`) when SQL is involved.
  - shared utilities (`ids`, `time`, typed models, errors).

UI (`desktop/ui/src`)
- `domains/<context>/`
  - `api/` IPC adapters (schema-aware).
  - `state/` context stores/composables.
  - `ui/` context components.
- `app/` shell, router composition, cross-domain wiring.
- Keep `lib/` only for truly cross-domain pure utilities.

## Guard rails (enforced)

1. Dependency direction
- Rust `core` must not depend on `commands`.
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
- Keep domain logic free of view framework concerns.

1. Extract by vertical slices
- Keep behavior unchanged per slice.
- Prefer small reversible pull requests.

1. Prioritized sequence
- Completed: workspace, training/quest, feedback, talk, exchange.
- In progress: recorder + ASR split.
- Next: run/platform boundary cleanup and app coordinator reduction.

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

- 2026-03-01: Transcript domain extraction (edit metadata builder) completed.
  - Rust: moved transcript edit metadata construction from `commands/transcription.rs` to `core/transcript.rs`.
  - Rust: `commands/transcription.rs` now delegates this concern to transcript domain helpers.

- 2026-03-01: Recorder backend extraction (trim codec utilities) completed.
  - Rust: extracted WAV trim/decode/encode/range helpers from `commands/audio.rs` into `core/recorder.rs`.
  - Rust: `commands/audio.rs` now delegates trim codec/range operations to `core/recorder`.
  - Tests: trim/decode utility tests moved to `core/recorder` module tests.

## Acceptance criteria

- New code lands in context modules by default.
- Core use-cases are traceable from route/command to domain service to storage adapter.
- Monolithic files are reduced and bounded by orchestration role.
- Architecture docs stay aligned with real topology.

## Exit criteria

This plan is complete when directory structure reflects bounded contexts and enforced guard rails prevent drift back to mixed monolith patterns.
