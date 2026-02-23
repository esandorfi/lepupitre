# Plan: Local-First Whisper Transcription (Live + Final)

## Scope and goals
- Local-only transcription (no network by default).
- Live transcript during recording + final transcript after stop.
- Cross-platform macOS (Metal) + Windows (CUDA if available; CPU fallback).
- Single session at a time (one user, one transcript).
- Maintainable, versioned IPC events and settings.

## Decisions locked
- **ASR engine**: whisper.cpp.
- **Integration**: sidecar process (preferred over FFI for packaging + maintainability).
- **Default model**: tiny bundled.
- **Upgrade model**: base downloadable in Settings.
- **Modes**:
  - Base: Live + Final by default.
  - Tiny: Auto benchmark -> Live + Final if fast enough; else Final only.
- **Model UI**: Settings only (no recorder dropdown).
- **Model storage**: `AppDataDir/LePupitre/models/whisper`
  - macOS: `~/Library/Application Support/LePupitre/models/whisper`
  - Windows: `%APPDATA%\LePupitre\models\whisper`
- **Events**: versioned payloads (e.g., `asr/partial/v1`).


## Status snapshot
- MR4: Live streaming uses the whisper sidecar (greedy decode).
- MR5: Final transcription uses the whisper sidecar (beam decode).
- MR6: Model management and download are implemented.


## MR plan (incremental)

### MR1 — Architecture + contracts (ADR, settings, events)
**Goals**
- Decide sidecar vs FFI in ADR (sidecar).
- Define event schema + settings contract.
- Establish model management policy and UI settings layout.

**Deliverables**
- ADR: sidecar + model management + event versioning.
- IPC contracts for:
  - `recording.start`, `recording.stop`
  - `asr/partial/v1`, `asr/commit/v1`, `asr/final_progress/v1`, `asr/final_result/v1`
- Settings schema:
  - `model`: tiny | base
  - `mode`: live+final | final-only | auto
  - `language`: auto | fixed
- UI Settings skeleton for model/mode.

**Quality gate**
- Types + schemas in UI and Rust aligned.
- Docs updated + changelog entry.

### MR2 — Audio capture pipeline
**Goals**
- `cpal` capture -> WAV writer + ring buffer.
- Shared timing source (ms).
- Start/stop UI wiring.

**Deliverables**
- Ring buffer utilities + unit tests.
- WAV writer (16k mono).

**Quality gate**
- Tests for ring buffer correctness.
- Start/stop works in UI.

### MR3 — DSP + VAD worker
**Goals**
- Resample + AGC + optional NS (if available).
- VAD + endpointing state machine.

**Deliverables**
- VAD unit tests (200ms start, 600–800ms stop).
- Endpoint transitions verified.

**Quality gate**
- Unit tests pass.
- No hallucinations during silence in dev recording.

### MR4 — Streaming ASR (live) [in progress]
**Goals**
- Sliding window decode (12s window, 0.8s step, 2s overlap).
- Two-pass decode (partial + refine).
- Stabilization (commit by timestamp).

**Deliverables**
- Live transcript UI with partial + committed segments.
- Event emissions wired.

**Quality gate**
- No rewrite of committed segments.
- Perceived latency ~1–2s on tiny/base.

### MR5 — Final transcript + exports [in progress]
**Goals**
- Full-pass decode after stop.
- Progress events.
- Export formats.

**Deliverables**
- `asr/final_progress/v1`, `asr/final_result/v1`
- Export txt/json/srt/vtt.

**Quality gate**
- Final transcript replaces live transcript.

### MR6 — Model management + downloads
**Goals**
- Bundled tiny model.
- Download base model with checksum.
- Auto benchmark for tiny to decide mode.

**Deliverables**
- Model list + download UX in Settings.
- Disk usage + version display.
- Download allowed only with explicit user action.

**Quality gate**
- No network unless user initiates download.
- Downloads verify checksum.

### MR7 — Hardening + tests
**Goals**
- Integration tests with prerecorded WAV.
- Performance guardrails (bounded buffers).
- CI updates if needed.

**Deliverables**
- Integration tests in CI (if feasible).
- Docs + changelog updated.

**Quality gate**
- Tests green on macOS + Windows.

## Open questions (to resolve in MR1)
- Which tiny/base GGUF variants to ship.
- How to detect GPU backend availability for sidecar selection.

## Risks
- Model size and build artifacts may exceed repo limits (use release assets).
- GPU backend selection may vary across user machines.
- Live transcription performance may require tuning step/window.
