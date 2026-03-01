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

`core/` is transitional compatibility only.
- No new feature logic is allowed under `core/`.
- Existing `core/*` modules are migrated into `domain/`, `platform/`, or `kernel/` in incremental slices.

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
- `core/`
  - temporary facade/re-export layer during migration only.

UI (`desktop/ui/src`)
- `domains/<context>/`
  - `api/` IPC adapters (schema-aware).
  - `state/` context stores/composables.
  - `ui/` context components.
- `app/` shell, router composition, cross-domain wiring.
- Keep `lib/` only for truly cross-domain pure utilities.

## Guard rails (enforced)

1. Dependency direction
- Rust `domain`, `platform`, `kernel`, and `core` must not depend on `commands`.
- New Rust files must not be added directly under `core/` (except compatibility wiring in `core/mod.rs`).
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
- Restarted (topology migration): move domain contexts outside `core/` first, then platform/kernel split, then remove `core` facade.
- Next:
  - migrate remaining contexts to `domain/<context>/`,
  - move adapter modules into `platform/`,
  - move shared primitives into `kernel/`,
  - delete legacy `core` modules when no import remains.

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

## Acceptance criteria

- New code lands in context modules by default.
- Domain use-cases are traceable from route/command to domain service to storage adapter.
- Monolithic files are reduced and bounded by orchestration role.
- Architecture docs stay aligned with real topology.

## Exit criteria

This plan is complete when:
- `domain/`, `platform/`, and `kernel/` are the only active backend layers (besides `commands/`),
- legacy `core/` feature modules are removed,
- enforced guard rails prevent drift back to mixed monolith patterns.
