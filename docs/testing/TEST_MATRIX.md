# Test Matrix (Living Specification)

Status: active  
Owner: maintainers  
Last updated: 2026-02-28

This matrix defines minimum test obligations for core product use cases.
When a source area changes, matching contract tests must be updated in the same PR.

## Levels

- `logic-spec`: pure logic contract tests (fast, deterministic).
- `command-flow`: backend use-case flow tests with SQLite boundaries.
- `release-smoke`: packaging/runtime smoke checks.

## Core use-case contracts

| Use case | Level | Source areas | Required tests |
|---|---|---|---|
| Workspace lifecycle (create/switch/rename/delete active profile) | command-flow | `desktop/src-tauri/src/commands/profile.rs` | `desktop/src-tauri/tests/workspace_flow.rs` |
| Quest training lifecycle (submit text/audio, latest report behavior) | command-flow | `desktop/src-tauri/src/commands/quest.rs` | `desktop/src-tauri/tests/quest_flow.rs` |
| Navigation and route behavior contracts | logic-spec | `desktop/ui/src/router/**`, `desktop/ui/src/lib/navigation*.ts` | `desktop/ui/src/router/routes.test.ts`, `desktop/ui/src/lib/navigation.test.ts`, `desktop/ui/src/lib/navigationMode.test.ts` |
| Quest guardrail UX logic | logic-spec | `desktop/ui/src/lib/questFlow.ts` | `desktop/ui/src/lib/questFlow.test.ts` |
| Feedback context retention | logic-spec | `desktop/ui/src/lib/feedbackContext.ts`, `desktop/ui/src/lib/feedbackReviewState.ts` | `desktop/ui/src/lib/feedbackContext.test.ts`, `desktop/ui/src/lib/feedbackReviewState.test.ts` |
| ASR error mapping | logic-spec | `desktop/ui/src/lib/asrErrors.ts` | `desktop/ui/src/lib/asrErrors.test.ts` |
| IPC schema alignment | logic-spec | `desktop/ui/src/schemas/ipc.ts`, `desktop/src-tauri/src/commands/**` | `desktop/ui/src/schemas/ipc.test.ts` |
| ASR sidecar decode runtime health | release-smoke | `desktop/src-tauri/src/core/asr_sidecar.rs`, `desktop/src-tauri/src/commands/transcription.rs` | `desktop/src-tauri/tests/asr_smoke.rs`, `.github/workflows/release-packaging.yml` |

## Rule

If a PR touches a listed source area, it must also touch the mapped required test file(s).
CI enforces this rule for selected high-risk backend domains first and will expand incrementally.
