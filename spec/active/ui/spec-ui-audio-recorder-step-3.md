# Audio Recorder Future Step 3 - Orchestration-Ready Foundation

## Goal
Introduce a minimal, explainable orchestration foundation and onboarding library contracts, without full algorithmic backend rollout.

## UX Priorities
1. Keep progression understandable ("what to do next").
2. Avoid repetitive onboarding prompts.
3. Maintain user trust with local-first behavior.
4. Keep recommendations explainable and predictable.

## Scope
1. Define local content contract for cards:
   - onboarding cards
   - training cards
2. Define minimal data contracts (schema-level, local storage):
   - `QuestCard`
   - `UserProfile` preferences subset
   - `UserProgress` impression/cooldown subset
   - `DecisionTrace` (why this CTA/card)
3. Add lightweight selection policy (frontend/domain local):
   - eligibility filter
   - cooldown exclusion
   - deterministic tie-break
4. Add routing rule baseline:
   - no transcript -> transcribe
   - transcript/no feedback -> analyze
   - feedback ready -> next quest or continue talk
5. Preserve manual override paths.

## Non-Goals
1. No complex weighted scoring engine yet.
2. No full backend migration to orchestration service.
3. No remote manifest dependency yet.
4. No mandatory user account/sync.

## Architecture Notes
1. Do not replace recorder core.
2. Add a thin policy layer above existing recorder state.
3. Keep policy deterministic and inspectable.

## Acceptance Criteria
1. Recommended next action is always produced for review states.
2. Recommendation includes human-readable reason.
3. Onboarding card repetition is reduced by cooldown rules.
4. Existing manual actions remain available.

## Test Plan
1. Policy tests:
   - eligibility/cooldown logic
   - deterministic output for same input
2. Flow tests:
   - onboarding user
   - quest user
   - quick record user
3. Explainability tests:
   - decision trace present and readable
4. Regression:
   - recorder transport and transcript features unaffected

