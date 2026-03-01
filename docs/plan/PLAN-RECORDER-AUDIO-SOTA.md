# Plan: Recorder Audio SOTA Hardening (Rust + Tauri + TS)

Status: implemented (2026-03-01)  
Parent: [docs/IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md)

## Goal

Make recording the fastest and most reliable first action for users, while preserving a Tauri-native architecture that scales on Windows and macOS.

Primary user journey target:

Quick record -> Stop -> Playback + quick clean -> Optional transcription -> Analyze/export

## Why this track now

The recorder is the first product value moment. Current behavior works, but discoverability and quality confidence are still below target:

- quick record is not a first-class shell action
- recording/transcription states can still feel coupled in UX
- waveform + inline playback are missing
- low-level guidance exists but no explicit calibration flow

## Current stack challenge (vs 2026 practical baseline)

| Topic | 2026 practical baseline | Current LePupitre state | Gap |
|---|---|---|---|
| Capture architecture | Native capture in Rust for desktop stability | Already native (`cpal`) in Rust | aligned |
| Tauri bridge | TS controls via commands; Rust emits lightweight UI frames/events | Already using commands + `recording/telemetry/v1` event | aligned |
| IPC strategy | Avoid raw PCM frame streaming over IPC | No raw PCM sent today | aligned |
| Live visualization | Meter + waveform/spectrum payloads from Rust | Meter/hints only; no waveform payload yet | partial |
| Playback in flow | In-page playback after stop and after trim | Only file-manager reveal action | gap |
| ASR dependency | Recording independent from sidecar/model; ASR optional post-step | Backend allows this; UI still needs clearer separation in default path | partial |
| Cleanup complexity | Basic flow simple; advanced editing behind explicit affordance | Trim controls are still prominent in quick-clean panel | partial |
| Input quality control | Device select + calibration + deterministic remediation | Hint states exist; no guided calibration/device flow yet | gap |

## Architecture guard rails (must stay true)

1. Keep audio capture and heavy processing in Rust.
1. Keep IPC payloads small and UI-rate limited (for example 30-60 Hz).
1. Never stream raw PCM buffers from Rust to UI over high-frequency IPC.
1. Keep canonical stored capture format stable for local processing and ASR interop.
1. Keep recorder usable when ASR sidecar/model are unavailable.

## Recording format policy

Recommended policy for current product stage:

- Canonical capture artifact: `WAV PCM16 mono 16kHz` (already used).
- Reason:
  - deterministic for local ASR pipeline and trimming
  - easy debugging and portability
  - no runtime codec complexity in critical capture path
- Optional future optimization:
  - add background export/transcode (Opus/AAC) for share channels
  - keep canonical analysis artifact as WAV.

## Execution plan

Execution status (2026-03-01):

- Phase 1 completed: quick-record primary entrypoint shipped.
- Phase 2 completed: record-only success path decoupled from ASR availability.
- Phase 3 completed: waveform telemetry + inline playback shipped.
- Phase 3b completed: style presets shipped with persisted preference.
- Phase 4 completed: input device selection + guided calibration shipped.
- Phase 5 completed: telemetry budget diagnostics + recorder smoke CI gates shipped.

### Phase 1: Recorder-first UX entrypoint

- Add `Quick record` action in shell header/nav (top + sidebar modes).
- Route to recorder context directly from any main area.
- Keep onboarding/help pointer for first run.

Done when:

- new users can discover and start recording in one click from primary shell
- no navigation mode regression (top vs sidebar persistence/fallback remains intact)

### Phase 2: Decouple recording from ASR prerequisites in UX

- Make capture flow explicitly model-agnostic:
  - record always available when mic is available
  - transcription shown as optional follow-up step
- Harden copy and status mapping so missing model/sidecar does not appear as capture failure.
- Add explicit state contract tests for `record-ok + transcribe-blocked`.

Done when:

- users can always record and playback without installed model
- missing sidecar/model is communicated only on transcription actions

### Phase 3: Waveform + inline playback

- Add lightweight waveform payload contract from Rust to TS for live and post-stop visualization.
- Render waveform in capture and quick-clean pages.
- Add inline audio player in quick-clean (play/pause/seek for latest artifact).
- Keep trim as advanced section (collapsed by default).
- Add style-mode support so waveform visuals can evolve without touching audio logic.

Done when:

- waveform updates smoothly without UI jank on Windows/macOS
- users can listen inside app immediately after recording and after trim

### Phase 3b: Waveform visual language (creative but controlled)

Goal: turn waveform rendering into a product signature, not a utility chart.

Implementation policy:

- Keep one rendering engine (`<canvas>` custom component) and separate style presets as pure visual configs.
- No style can change audio semantics (same peaks, same time mapping, same playback cursor behavior).
- Add style selection in UI preferences (`waveformStyle`) with safe fallback (`classic`).
- Default style remains highly readable for coaching sessions.

Style preset catalog (first iteration):

1. `classic`: clean continuous line + subtle fill.
1. `pulse-bars`: rounded vertical bars with dynamic breathing amplitude.
1. `ribbon`: mirrored band waveform with gradient center glow.
1. `spark`: compact dotted/particle-like peaks for lightweight mini-previews.

Visual constraints:

- Ensure AA readability in both light and dark theme tokens.
- Cursor and selected range must always keep >= AA contrast against waveform body.
- Keep motion meaningful only (record start, playhead movement, clipping pulses).

Performance constraints (all presets must pass):

- Stable 60 FPS target on typical development machine while recording.
- Bounded draw cost per frame (single canvas layer, no DOM point rendering).
- No long-session memory growth from unbounded point arrays.

Done when:

- at least 3 presets ship behind one common renderer
- users can switch style without restart and without recorder interruption
- all presets satisfy rendering and accessibility budgets

### Phase 4: Mic quality calibration and control

- Add recorder device/input section in advanced drawer:
  - input device selector
  - signal test mode (short guided check)
- Add deterministic remediation mapping:
  - too low -> move closer / switch input / OS gain guidance
  - clipping -> lower gain / increase distance
  - noisy room -> environment guidance
- Add optional auto-gain policy decision (explicit toggle if introduced).

Done when:

- quality warnings are actionable and repeatable
- users can run a quick calibration path before recording

### Phase 5: Performance and reliability gates

- Introduce recorder IPC budget checks (payload size, event rate) in dev diagnostics.
- Add cross-platform recorder smoke gate in CI (start/pause/resume/stop/trim/playback contract).
- Keep ASR smoke independent from recorder smoke.

Done when:

- recorder flow remains stable under CI and local quality gates
- telemetry/waveform events stay within declared budget

## Test obligations (living-spec style)

Add/maintain readable domain contract tests for:

1. quick record navigation contract (`top` and `sidebar` modes)
1. recording succeeds without model/sidecar, transcription remains blocked with deterministic error mapping
1. waveform payload schema alignment (Rust serde <-> UI Zod <-> UI usage)
1. waveform style contract (style switch preserves cursor/time mapping and does not mutate audio state)
1. inline playback contract after record and after trim
1. quality hint + calibration action mapping
1. no regression in quest/talk/feedback analyze prerequisites

## Risks and controls

- Risk: waveform payloads saturate IPC on low-end machines.
  Control: fixed event rate, bounded payload size, payload schema versioning.
- Risk: visual creativity introduces inconsistent behavior across presets.
  Control: one renderer core, preset-only style layer, shared behavior tests.
- Risk: UX complexity creeps back into quick-clean.
  Control: default panel keeps one primary CTA; advanced features collapsed.
- Risk: recorder and ASR concerns get coupled again.
  Control: explicit state machine contracts and tests for record-only success paths.
