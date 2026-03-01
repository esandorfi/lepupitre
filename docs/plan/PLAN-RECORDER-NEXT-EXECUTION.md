# PLAN-RECORDER-NEXT-EXECUTION

Status: proposed  
Owner: UI/ASR maintainers  
Target window: post-topology-freeze  
Last updated: 2026-03-01

## Objective

Execute the next-phase recorder migration from current UI to a dual-mode model:

- `classic` (current recorder),
- `next_review_2col` (record + 2-column review + onboarding cards),

while preparing a future API-driven quest/onboarding catalog with signed snapshot updates.

## Why this plan exists

- `SPEC-UI-AUDIO-RECORDER-NEXT_1_3`, `2_3`, `3_3` define the target UX and content intelligence.
- Current app already has stable recorder + training + talk logic contracts.
- We need a low-risk migration path with measurable product impact.

## Chosen decisions

1. A/B strategy: user-switchable mode (like top/sidebar nav), profile-persistent.
1. Catalog source of truth: versioned JSON catalog with schema validation.
1. Future update channel: signed snapshot pull with offline fallback and atomic activation.
1. Migration strategy: hybrid progressive (run both UIs in parallel, shared domain logic).

## Scope

### In scope

- Recorder UI dual-mode runtime.
- New 2-column review flow with onboarding/transcript/feedback-driven CTA state machine.
- Quest/onboarding/talk library model (`QuestCard`) and local decision engine.
- Future API readiness for signed catalog snapshots.

### Out of scope (this phase)

- Removing classic mode immediately.
- Hard dependency on live API for runtime selection.
- Backend schema redesign beyond compatibility hooks.

## Workstreams

## WS1 - Canonical spec consolidation

1. Merge NEXT 1/3 + 2/3 + 3/3 into one canonical implementation spec.
1. Normalize duplicated rules and lock final wording/state contracts.
1. Register status and source-of-truth mapping in docs ledger.

Exit criteria:

- One canonical vNext recorder spec is implementation reference.

## WS2 - Dual-mode runtime scaffolding

1. Add `recorder_ui_mode: "classic" | "next_review_2col"` in profile preferences.
1. Add UI switch in settings/shell.
1. Persist mode per profile and load at app bootstrap.

Exit criteria:

- User can switch modes without losing workflow/data continuity.

## WS3 - New recorder shell (next mode)

1. Implement `Screen A: Record` (single dominant CTA).
1. Implement `Screen B: Review 2-col` container.
1. Keep shared recorder domain API calls and IPC contracts.

Exit criteria:

- End-to-end record -> stop -> review loop works in next mode.

## WS4 - Review state machine and CTA policy

1. Define strict states:

- `no_transcript`,
- `transcribing`,
- `has_transcript_no_feedback`,
- `has_feedback`.

1. Map one primary CTA per state.
1. Enforce guardrails (`audio analyze requires transcript`).

Exit criteria:

- Deterministic action mapping and no ambiguous CTA.

## WS5 - Quest/onboarding/talk library v1

1. Introduce `QuestCard` catalog format:

- `kind`, `tags`, `eligibility`, `inputs`, `cta`, `rotation`.

1. Seed initial cards for contexts:

- `conference_talk`, `product_demo`, `pitch`, `team_update`, `classroom`.

1. Add preference signals:

- tone, guidance level, preferred context/goals.

Exit criteria:

- Catalog can drive onboarding and next-step quest selection locally.

## WS6 - Decision engine

1. Build selector context from run/talk/profile signals.
1. Implement scoring + cooldown + anti-repeat policy.
1. Route next action:

- `START_NEXT_QUEST` vs `OPEN_TALK_OR_CREATE`.

Exit criteria:

- Same input yields deterministic result; selection is auditable.

## WS7 - Signed snapshot update readiness

1. Add local snapshot manager abstraction.
1. Define manifest + signature verification contract.
1. Implement atomic activation and rollback to last good snapshot.
1. Keep remote sync disabled by default until API is available.

Exit criteria:

- Snapshot lifecycle works locally with trust checks and fallback.

## WS8 - Quality gates and rollout

1. Add unit/integration coverage for mode, state machine, decision engine.
1. Add A/B outcome metrics (local-first diagnostics).
1. Define promotion gates for making `next_review_2col` default.

Exit criteria:

- Next mode is stable and measurably better before default flip.

## Interfaces and types to add

1. Preference:

- `recorder_ui_mode`.

1. Catalog types:

- `QuestCardV1`,
- `QuestCardEligibilityV1`,
- `QuestCardActionV1`,
- `QuestDecisionContextV1`,
- `QuestDecisionResultV1`.

1. Snapshot types:

- `CatalogManifestV1`,
- `CatalogSnapshotV1`,
- signature/compatibility metadata.

## Test scenarios (must pass)

1. Profile-scoped A/B mode persistence.
1. Classic mode regression check (unchanged behavior).
1. Next mode transitions:

- no transcript -> onboarding CTA,
- transcript -> analyze CTA,
- feedback -> next step CTA.

1. Guardrail: cannot analyze audio quest without transcript.
1. Decision engine deterministic selection and cooldown behavior.
1. Snapshot verification:

- valid signature activates,
- invalid signature falls back,
- offline uses local cached catalog.

## Risks and mitigations

1. Spec drift across multiple NEXT docs.

- Mitigation: WS1 canonical consolidation first.

1. UX inconsistency between modes.

- Mitigation: shared domain logic and strict state contracts.

1. Over-complex onboarding library.

- Mitigation: minimal curated seed + iteration by metrics.

1. Future API trust concerns.

- Mitigation: signed snapshots + compatibility version gates + rollback.

## Promotion criteria (default switch)

1. Next mode parity on critical flows with zero blocker regressions.
1. Higher completion rates on transcript and feedback loop.
1. Stable CI on UI + backend contract tests.
1. Classic fallback retained for one full release cycle after switch.

## Assumptions

1. Existing Rust/IPC recorder contracts remain stable during this rollout.
1. API update service is future phase; local catalog must be production-capable first.
1. Help/onboarding markdown remains available and can coexist with QuestCard catalog.
