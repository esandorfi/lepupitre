# PLAN-TEST-GUARDRAILS

Status: proposed  
Owner: maintainers  
Last updated: 2026-02-28

## Objective

Turn tests into living product specifications and enforce them as guard rails for new code.

## Why now

- UI is actively redesigned, so visual tests are volatile.
- Product behavior contracts must remain stable for:
  - workspace lifecycle,
  - talk lifecycle,
  - quest/training loop,
  - feedback loop,
  - ASR and transcription reliability,
  - pack/review exchange.

## Current gaps

- Strong UI logic tests exist (`desktop/ui/src/lib/*.test.ts`) but backend command coverage is uneven.
- Several critical command modules have no tests (`profile`, `project`, `quest`, `run`, `pack`, `outline`, `peer_review`).
- No CI rule currently enforces domain-test updates when critical files change.
- No explicit coverage policy by layer.

## Workstreams

1. Test matrix as source of truth
- Add `docs/testing/TEST_MATRIX.md` mapping use-case contracts to required tests and file paths.
- Classify each contract by level:
  - `logic-spec` (fast, pure),
  - `command-integration` (SQLite + command boundary),
  - `release-smoke` (packaging/install/runtime health).

1. Backend command integration expansion
- Add integration tests for core command families:
  - workspace/profile,
  - talks/project,
  - quests/training,
  - runs/feedback,
  - packs/reviews.
- Require happy path + guardrail/failure path for each family.

1. CI obligation checks
- Add path-to-test obligation script.
- CI fails when core domain files are changed without corresponding domain tests.
- Keep allowlist explicit and reviewed.

1. Coverage posture
- Add coverage reporting for stable logic layers only:
  - UI `src/lib/*`,
  - Rust `src/core/*`.
- Introduce pragmatic thresholds and ratchet up gradually.

1. Readability as specification
- Standardize naming: domain + invariant + expected behavior.
- Enforce Given/When/Then test style for new spec tests.
- Keep one business invariant per test.

## Acceptance criteria

- Test matrix exists and is maintained in PRs affecting core behavior.
- Critical command modules have integration coverage for main invariants.
- CI blocks missing-test regressions for domain changes.
- Coverage signals are visible and actionable for stable layers.

## Exit criteria

This plan is complete when new feature additions cannot merge without:
- explicit contract mapping in tests,
- domain-appropriate test updates,
- and guard rails passing in CI.
