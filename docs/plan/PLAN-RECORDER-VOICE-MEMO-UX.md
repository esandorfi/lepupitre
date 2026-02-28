# Plan: Recorder Voice-Memo UX (Speaker-First)

## Summary

Design the recorder flow as "voice memo simple" on top, with quality guardrails and transcript editing power underneath.

Primary journey:

Record -> Quick Clean (text-first) -> Analyze/Export

This plan keeps cognitive load low while improving trust, speed, and usability.

## Product decisions locked

- Audience: speaker training (not podcast production).
- UI strategy: simple default + advanced drawer.
- Quick Clean scope (this release): text clean only, no waveform trim yet.
- Export UX: talk presets + one primary export action.
- Performance default: speed-first (tiny, auto-transcribe on stop).

## What we keep vs change

Keep:

- Existing local ASR pipeline and events (`asr/partial`, `asr/commit`, `asr/final_*`).
- Existing artifact model and transcript export formats.

Change:

- Recorder UI hierarchy and state feedback.
- Add transcript editing and "use edited transcript for analysis" path.
- Add explicit quality status language and recorder confidence cues.

## 1) UI blueprint (decision-complete)

### Screen A: Record (default view)

- Giant `Record / Pause / Resume / Stop` control.
- Large timer and unmistakable recording badge.
- Live level meter always visible during capture.
- One quality pill state:
  - `Good level`
  - `Too quiet - move closer`
  - `Too loud - clipping`
  - `Noisy room`
- Show only short transcript preview while recording (not full transcript wall).
- Move technical controls (model/mode/language/live detail) into `Advanced` drawer.

### Screen B: Quick Clean (after stop)

- Default focus on transcript text editor.
- Show only 3 actions:
  1. `Edit transcript`
  2. `Auto clean fillers`
  3. `Fix punctuation`
- Keep "Open original audio" as secondary action.
- No waveform trim in this release (explicitly deferred).

### Screen C: Analyze / Export

- Show presets first:
  - `Presentation` (default primary CTA)
  - `Podcast`
  - `Voice note`
- `More formats` reveals detailed export buttons (`txt/json/srt/vtt`).
- Analysis CTA uses edited transcript version when present.

## 2) UX rules and behaviors

### Recording confidence rules

- On start success, badge must switch instantly to clear REC state.
- If microphone inactive/no input for N seconds, show `No signal`.
- If clipping threshold exceeded repeatedly, pin warning until level normalizes.
- If sidecar/model missing, disable transcribe CTA and show direct fix action.

### Simplicity rules

- Never show more than one primary CTA per phase.
- Do not display raw technical statuses in default mode.
- Keep advanced controls collapsed by default and sticky per user preference.

### Accessibility rules

- Keyboard shortcuts:
  - `Space`: record/pause/resume/stop (context-aware)
  - `Cmd/Ctrl+Enter`: transcribe/analyze in relevant phase
- Large click targets for core controls.
- Announce recorder state changes for screen readers (`recording started/stopped`).

## 3) Backend/API changes

### New command

- `transcript_edit_save(profile_id, transcript_id, edited_text) -> { transcript_id }`
- Store edited transcript as new artifact, keep original immutable.
- Metadata links:
  - `source_transcript_id`
  - `edit_kind: manual`
  - timestamp/model info passthrough

### Optional event (recommended)

- `recording/telemetry/v1`
- Payload:
  - `durationMs`
  - `level`
  - `isClipping`
  - `signalPresent`
  - `qualityHintKey`
- Use this to replace frequent polling for smoother status updates.

### Existing command integration

- Quest flow updates `quest_submit_audio(..., transcriptId)` to edited transcript id when chosen.
- Boss run flow calls `run_set_transcript` with edited transcript id when chosen.

## 4) Frontend architecture changes

### AudioRecorder component refactor

- Split into internal phases:
  - `capture`
  - `quick_clean`
  - `analyze_export`
- Extract subcomponents:
  - `RecorderCapturePanel`
  - `RecorderQuickCleanPanel`
  - `RecorderExportPanel`
- Add `AdvancedDrawer` component for technical toggles and diagnostics.

### State model

Add state:

- `baseTranscriptId`
- `editedTranscriptId`
- `activeTranscriptIdForAnalysis`
- `qualityHintKey`
- `isClipping`
- `signalPresent`

Default:

- `activeTranscriptIdForAnalysis = editedTranscriptId ?? baseTranscriptId`

### Copy/microcopy

- Replace low-level statuses with plain-language hints in default mode.
- Keep detailed error code mapping only in advanced drawer.

## 5) Performance and speed plan

- Enable auto-transcribe right after stop (default on).
- Keep `tiny` as default model for speed-first profile.
- Keep decode pipeline as-is; optimize perceived speed through immediate phase transition and progressive transcript rendering.
- Move UI telemetry from polling to pushed events if implemented.

## 6) Test scenarios

### Core flows

- Record -> stop -> auto-transcribe enters Quick Clean automatically.
- Editing transcript creates new artifact and does not mutate original.
- Analyze action uses edited transcript id when available.
- Export preset primary CTA produces expected default output path.

### Reliability

- Missing model/sidecar path shows deterministic warning + fix action.
- Clipping/no-signal hints update correctly from telemetry.
- Keyboard shortcuts do not trigger while typing in transcript editor.

### Regression

- Existing exports (`txt/json/srt/vtt`) remain valid.
- Quest and boss-run feedback prerequisites still enforced.
- IPC schema validation remains aligned (Rust serde casing <-> Zod).

## 7) Explicitly deferred

- Audio waveform trimming UI and backend.
- One-click audio denoise/enhance DSP controls in UI.
- Multi-track recording/editing.
- MP3/AAC generation pipeline if not already available.
- Remote interview capture.

## 8) Assumptions

- Internal canonical audio remains WAV 16k mono.
- Product priority stays speaker coaching over podcast production.
- This release goal is trust + speed + simplicity, not pro-audio depth.
