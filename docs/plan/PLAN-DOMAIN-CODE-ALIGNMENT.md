# PLAN-DOMAIN-CODE-ALIGNMENT

Status: proposed  
Owner: maintainers  
Last updated: 2026-02-28

## Objective

Align repository structure with product bounded contexts so code reads by use-case first, framework second.

## Audit snapshot

Current hotspots:
- Rust command modules are large and mixed by concern (`audio.rs`, `pack.rs`, `transcription.rs`, `coach.rs`).
- UI has a large orchestration store (`desktop/ui/src/stores/app.ts`) and several large page files.
- Domain logic is partly centralized in `ui/src/lib/*`, which is good, but domain ownership is not explicit by context.

## Bounded contexts (target map)

1. Workspace context
- profiles, active workspace selection, workspace-scoped preferences.

1. Talk lifecycle context
- talk creation, metadata, stage transitions, outline/builder.

1. Training/Quest context
- daily quest selection, attempts, progression guardrails.

1. Run/Feedback context
- boss runs, analysis, feedback context/timeline/notes.

1. Exchange context
- pack export/import, peer review payloads.

1. ASR context
- sidecar lifecycle, model management, live/final transcription.

1. Platform context
- preferences persistence, security probes, release/runtime wiring.

## Target topology (incremental)

Rust (`desktop/src-tauri/src`)
- `commands/`
  - thin command entrypoints only (validation + orchestration).
- `core/`
  - `domain/<context>/` models + invariants.
  - `application/<context>/` use-case services.
  - `infra/sqlite/<context>/` table/query modules.
  - `infra/asr/` sidecar/model runtime.
  - shared utilities (`ids`, `time`, errors).

UI (`desktop/ui/src`)
- `domains/<context>/`
  - `logic/` pure domain logic + tests.
  - `api/` IPC adapters (schema-aware).
  - `state/` context store/composables.
  - `ui/` context-specific components.
- `app/` shell, router composition, cross-domain wiring.
- Keep `lib/` only for truly cross-domain utilities.

## Migration strategy

1. Freeze dependency direction rules
- command/page layers may depend on domain logic; domain logic must not depend on page/view concerns.

1. Extract by vertical slice
- prioritize `workspace`, `quest`, `feedback`, then `talk`, then `pack`.
- move logic without behavior changes first; keep PRs small.

1. Split monolith orchestrators
- Rust: break large command files into service modules.
- UI: break `stores/app.ts` into context stores with a small app coordinator.

1. Add structural guard rails
- file-size budget warnings for command/store/page hotspots.
- lint/check script for forbidden cross-context imports.

## Progress updates

- 2026-02-28: Workspace slice started.
- Rust: `commands/profile.rs` reduced to thin command entrypoints; workspace behavior moved to `core/workspace.rs`.
- UI: workspace profile IPC calls extracted to `ui/src/domains/workspace/api.ts`; `stores/app.ts` consumes this boundary.
- 2026-02-28: Quest slice completed.
- Rust: `commands/quest.rs` reduced to thin command entrypoints; quest behavior moved to `core/quest.rs`.
- UI: quest IPC calls extracted to `ui/src/domains/quest/api.ts`; `stores/app.ts` consumes this boundary.
- 2026-02-28: Feedback slice completed.
- Rust: `commands/feedback.rs` reduced to thin command entrypoints; feedback behavior moved to `core/feedback.rs`.
- UI: feedback IPC calls extracted to `ui/src/domains/feedback/api.ts`; `stores/app.ts` consumes this boundary.
- 2026-02-28: Talk slice completed.
- Rust: `commands/project.rs` and `commands/outline.rs` reduced to thin command entrypoints; talk behavior moved to `core/project.rs` and `core/outline.rs`.
- UI: talk IPC calls extracted to `ui/src/domains/talk/api.ts`; `stores/app.ts` consumes this boundary.

## Acceptance criteria

- New code lands in context modules by default.
- Core use-cases are traceable from route/command to domain service to storage adapter.
- Monolithic files are reduced and bounded by orchestration role.
- Architecture docs stay aligned with real topology.

## Exit criteria

This plan is complete when directory structure reflects bounded contexts and enforced guard rails prevent drift back to mixed monolith patterns.
