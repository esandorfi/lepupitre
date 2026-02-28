# Test Matrix (Living Specification)

Status: active  
Owner: maintainers  
Last updated: 2026-02-28

This is the single testing source of truth for product behavior contracts.
It is intentionally domain-first and implementation-light.

## Rule #1

Simplicity and maintainability come first.
If a test becomes hard to read or requires heavy ad hoc setup, treat it as a code design smell and simplify production boundaries first.

## Test intent levels

- `logic-spec`: deterministic business rules and mapping logic.
- `flow-spec`: end-to-end domain behavior through backend use-case boundaries.
- `release-smoke`: packaging/runtime confidence checks.

## Product contracts

1. Workspace lifecycle (`flow-spec`)
- Creating, switching, renaming, and deleting workspaces keeps one valid active workspace state.
- Invalid workspace transitions fail deterministically.

1. Talk lifecycle (`flow-spec`)
- Talk creation, activation, and stage progression remain coherent and reversible.

1. Quest and training lifecycle (`logic-spec` + `flow-spec`)
- Quest guardrails are enforced (cannot analyze before required inputs).
- Text/audio submission rules are consistent; latest-attempt behavior is deterministic.

1. Run and feedback lifecycle (`flow-spec`)
- Run analysis requires valid prerequisites.
- Feedback linking is deterministic and idempotent where expected.
- Notes and timeline context stay consistent.

1. Navigation and context retention (`logic-spec`)
- Route contracts, breadcrumbs, and context propagation remain stable across UI changes.

1. ASR and transcription reliability (`logic-spec` + `release-smoke`)
- Known ASR error states map deterministically.
- Sidecar and transcription smoke checks remain stable in release workflows.

1. IPC contract alignment (`logic-spec`)
- UI schemas and backend payload/event shapes remain synchronized.

## Enforcement

CI enforces selected high-risk backend obligations.
Enforcement mechanics live in repository scripts/workflows and may evolve without changing this domain contract document.
