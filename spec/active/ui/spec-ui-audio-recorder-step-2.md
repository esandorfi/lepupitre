# Audio Recorder Future Step 2 - Context-Adaptive UX

## Goal
Make recorder UX context-aware (onboarding, daily quest, quick record) while keeping a single backend/frontend recorder core.

## UX Priorities
1. Preserve fast path for quick recording users.
2. Make daily-quest progression explicit and efficient.
3. Keep onboarding helpful, short, and non-intrusive.
4. Keep one dominant action per state and context.
5. Preserve temporal transcript intelligence.

## Scope
1. Introduce `RecorderContextProfile` (frontend):
   - `onboarding`
   - `daily_quest`
   - `quick_record`
2. `AudioRecorder` resolves UI hierarchy from entry context:
   - section ordering
   - CTA priority
   - prominence of analyze/export
3. Keep the same internal phases (`capture`, `quick_clean`, `analyze_export`).
4. Add playback speed control only (`0.75x`, `1.0x`, `1.25x`, `1.5x`) if low-risk.
5. Progressive disclosure v2:
   - advanced remains collapsed
   - reduced prominence until first successful transcript

## Non-Goals
1. No split into separate recorder engines per context.
2. No skip-silence/repeat implementation.
3. No backend orchestration engine.
4. No cloud requirements.

## Architecture Notes
1. One core component tree; context changes behavior, not architecture.
2. Keep current emitted events:
   - `saved`
   - `transcribed`
   - `analyze`
3. No IPC contract changes in this step.

## Acceptance Criteria
1. The same run state appears differently by context with coherent intent.
2. Onboarding context promotes transcription CTA.
3. Daily quest context promotes analyze/feedback progression.
4. Quick record context promotes capture/playback and minimal clutter.
5. Core recorder logic remains unchanged and shared.

## Test Plan
1. Context matrix tests:
   - each review state across 3 contexts
2. UI behavior tests:
   - CTA priority and visibility
   - section order by context
3. Regression tests:
   - no-signal auto-stop remains stable
   - transcript timing UX unchanged
4. Playback speed tests:
   - speed change reflects in audio playback

