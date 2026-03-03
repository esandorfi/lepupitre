# Audio Recorder Future Step 1 - Coherent Review Foundation

## Goal
Establish a clear, low-friction recorder-to-review experience with one dominant action per state, while preserving existing time-aware transcript capabilities.

## UX Priorities
1. Fast recording and immediate progression.
2. One primary CTA per review state.
3. Keep raw/clean/time linkage visible and usable.
4. Onboarding is non-blocking.
5. Local-first trust remains explicit.

## Scope
1. Desktop review uses a 2-column layout.
2. Mobile review collapses to 1 column.
3. Add onboarding card when transcript is absent:
   - Audience (chips + optional text)
   - Goal (chips)
   - Optional target duration
4. Define explicit review state matrix:
   - `review_no_transcript`
   - `review_transcribing`
   - `review_transcript_ready`
   - `review_analysis_ready`
5. CTA matrix:
   - no transcript -> `Generate transcription (local)`
   - transcribing -> disabled progress CTA
   - transcript ready -> `Analyze`
   - analysis ready -> `View feedback` (or export fallback)
6. Keep existing time/raw/clean features:
   - 30s markers
   - 10s raw chunks
   - clean-text anchors
   - anchor-map JSON export
7. Keep advanced panel collapsed and visually secondary.

## Non-Goals
1. No new backend IPC commands.
2. No onboarding preference persistence.
3. No quest-orchestration logic.
4. No skip-silence or repeat tools.

## Architecture Notes
1. Keep one `AudioRecorder` core state machine.
2. Implement review UI changes inside existing `quick_clean` phase.
3. No route-level refactor.

## Acceptance Criteria
1. Exactly one primary CTA is visible per review state.
2. No-transcript onboarding is displayed and skippable.
3. Existing temporal transcript tools remain functional.
4. `Record -> Stop -> Review` remains faster or equal to current flow.
5. No regressions in `QuickRecord`, `Quest`, `BossRun` entry behavior.

## Test Plan
1. Unit tests:
   - review state resolution
   - CTA mapping by state
2. Component tests:
   - onboarding block in no-transcript state
   - transcript workspace in transcript state
3. Integration tests:
   - `Record -> Stop -> no transcript review -> Transcribe`
   - `Transcribe -> Analyze` transition
4. Regression checks:
   - marker seek
   - chunk seek
   - anchor export
   - analyze emit payload

