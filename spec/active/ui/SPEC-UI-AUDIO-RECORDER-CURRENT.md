# Audio Recorder UI (Current Implementation)

This document specifies the current Audio Recorder UI behavior as implemented in the desktop app (Vue + Tauri), including layout, functions, states, and action targets.

## UX Priorities

The current implementation is organized around two product priorities.

1. Easy recording and fast progression
   - Capture controls are intentionally minimal (`start/pause/resume`, `stop`).
   - Recorder supports auto-stop on sustained no-signal to reduce dead-air handling friction.
   - Post-stop flow moves directly to quick-clean and optional transcription.
2. Time-aware transcript analysis (raw + clean text)
   - Raw segment time is preserved as the source of truth for timeline navigation.
   - Quick-clean exposes 30s markers and 10s raw chunks for direct time navigation.
   - Clean text remains editable while keeping approximate time anchors.
   - An anchor-map JSON export provides machine-readable raw/clean/time linkage.

## Scope

- Frontend: `desktop/ui/src/components/AudioRecorder.vue` and recorder subcomponents.
- Frontend integration points: `desktop/ui/src/pages/QuickRecordPage.vue`, `QuestPage.vue`, `BossRunPage.vue`.
- Frontend domain APIs and contracts:
  - `desktop/ui/src/domains/recorder/api.ts`
  - `desktop/ui/src/domains/asr/api.ts`
  - `desktop/ui/src/schemas/ipc.ts`
- Backend command targets:
  - `desktop/src-tauri/src/commands/audio.rs`
  - `desktop/src-tauri/src/commands/transcription.rs`

## Component Architecture

## Top-level component

- `AudioRecorder.vue` orchestrates:
  - recording transport
  - ASR readiness checks
  - transcription lifecycle
  - phase transitions
  - telemetry/event subscriptions
  - integration with parent pages via emitted events

## Child components

- `RecorderCapturePanel.vue`: capture transport controls, quality badge, waveform, live transcript preview.
- `RecorderQuickCleanPanel.vue`: playback, transcribe trigger, clean transcript editing, timeline markers, raw chunks, trim, anchor-map export.
- `RecorderExportPanel.vue`: analyze action and transcript export actions.
- `RecorderAdvancedDrawer.vue`: advanced ASR/recorder settings and diagnostics.
- `RecorderWaveform.vue`: waveform visualization renderer used in capture and quick-clean.

## Layout and Phase Structure

`AudioRecorder.vue` renders a shared shell:

- Header: title/subtitle/pass label
- Phase indicator line:
  - `capture`
  - `quick_clean`
  - `analyze_export`
- Main phase panel (one of capture / quick-clean / analyze-export)
- Advanced drawer (always present, collapsible)
- Footer status area:
  - saved path
  - errors
  - contextual help links

## Phase 1: Capture

Rendered by `RecorderCapturePanel` when `phase === "capture"`.

### Visual blocks

- Primary transport controls:
  - primary action: start/pause/resume
  - stop action
- REC badge shown only while actively recording (not while paused)
- Duration display (`MM:SS`)
- Quality badge (`good/warn/danger/muted` style)
- Waveform + level meter
- Live transcript preview in two lines:
  - previous committed line
  - current line (latest committed + partial)

### Capture behavior highlights

- Primary action state:
  - `start` if idle
  - `pause` if recording
  - `resume` if paused with active recording session
- Stop label is currently `Stop`.
- `no_signal` quality state is treated as warning tone (not danger).

### Auto-stop on silence

During active recording, if `qualityHintKey === "no_signal"`:

- starts a silence timer
- if silence lasts at least `5000ms` and recording duration is at least `6000ms`:
  - recorder auto-calls `stopRecording()`
  - announces auto-stop message
  - normal post-stop flow continues (including optional auto-transcribe)

## Phase 2: Quick Clean

Rendered by `RecorderQuickCleanPanel` when `phase === "quick_clean"`.

### Section order

1. Playback section
   - waveform
   - HTML audio player (multiple source URLs)
2. If no transcript yet:
   - transcribe CTA and blocked-hint message
3. If transcript exists:
   - timeline markers (every 30s) with click-to-seek
   - clean text editor
   - clean-text anchor panel (approx line-to-time mapping)
   - anchor-map JSON export
   - clean-up actions (save edited / auto-clean fillers / fix punctuation)
   - raw chunks panel (10s windows, collapsible)
4. Bottom action row:
   - open original audio
   - continue to analyze/export
5. Advanced trim panel (collapsible):
   - start/end sliders
   - selected duration
   - apply trim

### Transcript timeline model

- Raw timing source: `rawTranscriptSegments` (from `sourceTranscript` in parent).
- Marker model:
  - `timelineMarkers`: 30s marks with preview based on 10s text windows.
  - `rawTimelineChunks`: 10s windows with source text overlap.
- Clean mapping model:
  - text-token overlap heuristic maps each clean line to a raw chunk.
  - used for clean anchor list and caret-based seek.

### Quick-clean interaction details

- Clicking timeline marker seeks playback to marker time.
- Clicking a raw chunk seeks to chunk start time.
- Clicking inside clean textarea seeks to inferred time for current caret line.
- Export anchor map downloads a JSON file with:
  - `schemaVersion`
  - generation timestamp
  - `timelineMarkers`
  - `rawChunks`
  - `cleanAnchors`

## Phase 3: Analyze / Export

Rendered by `RecorderExportPanel` when `phase === "analyze_export"`.

### Actions

- Analyze (`emit("analyze")`) delegated to parent page.
- Export presets:
  - presentation -> `.txt`
  - podcast -> `.srt`
  - voice_note -> `.vtt`
- More formats toggle:
  - explicit `.txt`, `.json`, `.srt`, `.vtt`
- Open export path action when available.
- Back to quick-clean action.

## Advanced Drawer

Rendered by `RecorderAdvancedDrawer`.

### Controls

- ASR model (`tiny`, `base`)
- ASR mode (`auto`, `live+final`, `final-only`)
- ASR language (`auto`, `en`, `fr`)
- spoken punctuation toggle
- waveform style selector
- input device selector + refresh
- quality guidance messages
- telemetry budget summary
- diagnostics code display (if present)

### Collapse behavior

- Toggle button with chevron icon text indicator (`>` / `v`).

## State Model

## Core state (selected)

- Phase: `"capture" | "quick_clean" | "analyze_export"`
- Transport flags:
  - `isRecording`
  - `isPaused`
  - `isStarting` (start in-flight guard)
- Status key:
  - `audio.status_idle`
  - `audio.status_requesting`
  - `audio.status_recording`
  - `audio.status_encoding`
- Artifacts:
  - `lastArtifactId`
  - `lastSavedPath`
  - `lastDurationSec`
- Transcript state:
  - `transcript` (active)
  - `sourceTranscript` (raw timing source)
  - `baseTranscriptId`
  - `editedTranscriptId`
  - `transcriptDraftText`
- Guard/error state:
  - `transcribeBlockedCode`
  - `transcribeBlockedMessage`
  - `error` / `errorCode`
- Quality/signal:
  - `qualityHintKey`
  - no-signal auto-stop timer state

## Derived state (selected)

- `capturePrimaryAction`: `start | pause | resume`
- `captureCanPrimary`: false while starting/encoding or no active profile
- `captureCanStop`: true only with active recording id and not encoding/starting
- `canTranscribe`: from `resolveRecorderTranscribeReadiness`
- `canAnalyzeRecorder`: requires transcript id + parent permission
- `activeTranscriptIdForAnalysis`: prefers edited over base transcript id

## Transition model (high-level)

- Start recording -> `capture` + `status_requesting` -> `status_recording`
- Stop recording -> `status_encoding` -> `quick_clean` + `status_idle`
- Optional auto-transcribe after stop (if readiness allows)
- Continue from quick-clean -> `analyze_export`
- Back from analyze-export -> `quick_clean`

## Action Targets (UI -> Side Effects)

## Capture actions

- Start:
  - target: `recording_start` IPC
  - API wrapper: `recordingStart(...)`
- Pause:
  - target: `recording_pause` IPC
  - wrapper: `recordingPause(recordingId)`
- Resume:
  - target: `recording_resume` IPC
  - wrapper: `recordingResume(recordingId)`
- Stop:
  - target: `recording_stop` IPC
  - wrapper: `recordingStop(profileId, recordingId)`

## Quick-clean actions

- Transcribe now:
  - target: `transcribe_audio` IPC
  - wrapper: `transcribeAudio(...)`
- Save edited transcript:
  - target: `transcript_edit_save` IPC
  - wrapper: `transcriptEditSave(...)`
- Apply trim:
  - target: `audio_trim_wav` IPC
  - wrapper: `audioTrimWav(...)`
- Reveal/open original audio file:
  - target: `audio_reveal_wav` IPC
  - wrapper: `audioRevealWav(path)`
- Open exported transcript path:
  - target: OS shell open
  - wrapper: `@tauri-apps/plugin-shell` `open(path)`
- Export anchor map:
  - target: browser-style client download (Blob + temporary anchor element)

## Analyze/export actions

- Analyze:
  - target: parent component via `emit("analyze", { transcriptId })`
- Export transcript format:
  - target: `transcript_export` IPC
  - wrapper: `transcriptExport(profileId, transcriptId, format)`

## Navigation targets from recorder

- Missing model error action -> route `/settings`
- Sidecar missing/incompatible action -> route `/help`

## Event Subscriptions and Runtime Streams

The recorder subscribes to Tauri event channels and updates local state:

- Job lifecycle:
  - `job:progress`
  - `job:completed`
  - `job:failed`
- Recording telemetry:
  - `recording/telemetry/v1`
- Live ASR:
  - `asr/partial/v1`
  - `asr/commit/v1`
- Final ASR:
  - `asr/final_progress/v1`
  - `asr/final_result/v1`

Fallback behavior:

- if telemetry stream is absent/late, status polling uses `recording_status`.

## Contract and Validation Layer

- Frontend command calls use `invokeChecked(...)` with Zod schemas.
- Payload/response/event schema source: `desktop/ui/src/schemas/ipc.ts`.
- Relevant command names:
  - Recorder: `recording_start`, `recording_status`, `recording_pause`, `recording_resume`, `recording_stop`, `recording_input_devices`, `recording_telemetry_budget`, `audio_trim_wav`, `audio_reveal_wav`
  - ASR/Transcript: `transcribe_audio`, `transcript_get`, `transcript_edit_save`, `transcript_export`, `asr_sidecar_status`, `asr_model_verify`

## Parent Page Integration

`AudioRecorder` is reused in:

- `QuickRecordPage.vue` (standalone quick recording, no analyze action)
- `QuestPage.vue` (quest audio capture + transcript/analyze flow)
- `BossRunPage.vue` (boss run capture + analyze/report flow)

Parent-facing emitted events:

- `saved` -> `{ artifactId, path }`
- `transcribed` -> `{ transcriptId, isEdited?, baseTranscriptId? }`
- `analyze` -> `{ transcriptId }`

## Current UX/Tech Notes

- Recorder UI uses mostly custom app button/panel styles rather than full Nuxt UI action primitives.
- Collapsible zones use native `<details>/<summary>` with custom chevron behavior.
- Playback sources include both `convertFileSrc(path)` and `file://` fallback.
- Transcript timing for edited transcripts currently keeps source segment time windows on backend side (rather than uniform splitting).
