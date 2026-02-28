Below is a **specification document** you can paste into Codex to plan + implement this feature in your existing Rust/Tauri app, aiming for a “WhisperFlow-like” SOTA user experience **without retraining** (just better streaming + decoding + stabilization).

---

# Specification: Local-First Live & Final Transcription (whisper.cpp) for Rust/Tauri (macOS + Windows)

## 0) Summary

Implement a local-first speech-to-text feature with two modes:

1. **Live transcript** during recording (low flicker, 1–2s latency target).
2. **Final transcript** after recording stops (higher quality offline pass).

The system uses **whisper.cpp** as the ASR engine and improves perceived “SOTA streaming” quality via:

* audio DSP conditioning (NS/AGC/resample),
* VAD + endpointing,
* sliding window decoding with overlap,
* two-pass decoding (fast partials + refine),
* transcript stabilization (commit rules),
* final full-pass transcription on the saved recording.

whisper.cpp provides a naive streaming example (sampling every ~0.5s) which is a baseline reference, but we will implement a more robust pipeline around it. ([GitHub][1])

---

## 1) Goals & Non-Goals

### Goals

* **Local-first**: no network dependency; all compute on-device.
* **Cross-platform**: macOS (Metal) + Windows (CUDA if available; CPU fallback).
* **Latency**: live updates every ~0.8s with ~1–2s perceived delay.
* **User experience**: stable transcript with minimal flicker; one “partial” line + committed lines.
* **Quality**: final transcript noticeably better than live; punctuation/casing optional.

### Non-Goals

* Model training or fine-tuning.
* Multi-speaker diarization (optional future).
* Cloud sync / server transcription.

---

## 2) User Stories

1. As a user, I press **Record** and see a live transcript that updates smoothly.
2. As a user, when I stop recording, I receive a **final refined transcript**.
3. As a user, I can copy/export transcript and optionally the audio.

---

## 3) Requirements

### Functional Requirements

* Start/stop recording from UI.
* Live transcript stream:

  * shows partial updates while speaking,
  * commits stable segments progressively,
  * handles silence robustly (no hallucinations during silence).
* Final transcript:

  * runs after stop on the saved audio file,
  * returns final segments + full text.
* Persist audio recording locally (WAV/FLAC).
* Support configuration:

  * language (auto or fixed),
  * model size/quant,
  * latency mode (balanced vs quality),
  * optional vocabulary/hotwords prompt.

### Non-Functional Requirements

* UI must remain responsive (no blocking main thread).
* Model is loaded once per session (avoid repeated init).
* Memory bounded (ring buffers, windowed audio).
* Clear error messaging if GPU backend unavailable.

---

## 4) High-Level Architecture

### Recommended approach: Sidecar ASR service

Bundle whisper.cpp as a **sidecar process** managed by Tauri:

* Pros: easier cross-platform packaging (Metal build on macOS, CUDA build on Windows), simpler isolation.
* Communication: JSON over stdin/stdout (or named pipes).

Alternative: FFI integration is allowed but requires strict thread ownership of whisper context.

### Components / Threads

**A) UI (Tauri frontend)**

* Controls recording state
* Subscribes to ASR events:

  * partial text
  * committed segments
  * final progress + final result

**B) Audio Capture (Rust)**

* `cpal` capture mic audio in frames (10–20 ms)
* Writes into:

  * ring buffer for live pipeline
  * audio file writer for final transcript

**C) DSP + VAD Worker**

* Reads frames from ring buffer
* Applies DSP chain:

  1. Resample → 16kHz mono (if needed)
  2. AGC / normalization
  3. Noise suppression (RNNoise or WebRTC NS)
  4. Optional high-pass filter
* Runs VAD + endpointing:

  * detect speech start/end
  * gate decoding on speech

**D) ASR Worker (whisper.cpp)**

* Maintains sliding audio window buffer
* Runs two-pass decoding:

  * Pass A: frequent partials
  * Pass B: refine/commit on boundaries or periodic

**E) Final Transcription Job**

* On stop: run full-pass transcription on saved audio (higher quality settings)
* Returns final segmented transcript

---

## 5) Streaming Strategy (Live Transcript)

### Key parameters (balanced preset)

* `window_len`: 12.0 s
* `step`: 0.8 s (decode cadence)
* `overlap_keep`: 2.0 s
* `endpoint_silence`: 0.6–0.8 s silence to finalize speech region
* `commit_delay`: 2.5–3.0 s (overlap + safety)

### Sliding Window Mechanism

Maintain a rolling audio buffer of `window_len`. Each `step`:

1. Snapshot last `window_len` audio samples.
2. Decode snapshot.
3. Update:

   * `partial_text` (unstable)
   * commit older segments based on timestamps

### Two-pass decoding

**Pass A (partial, low latency)**

* Trigger: every `step` while VAD indicates speech.
* Settings: greedy / small beam, reduced compute.
* Output: partial hypothesis for UI.

**Pass B (refine, higher quality)**

* Trigger:

  * when speech ends (endpoint),
  * OR every ~3–4 seconds during continuous speech.
* Settings: higher beam/best-of and allow temperature fallback.

whisper.cpp supports decoder fallback thresholds (e.g., logprob threshold and temperature fallback) that can be leveraged in refine/final passes. ([GitHub][2])

### Stabilization / “Commit Rules”

Maintain:

* `stable_segments: Vec<Segment>` committed and never altered
* `partial_line: String` may change

Commit rule (timestamp-based):

* commit segments whose `end_ms < now_ms - commit_delay_ms`

Optional additional rule:

* commit words that appear unchanged across 2 consecutive decodes.

**Important:** only ever rewrite the partial line; never rewrite committed segments.

---

## 6) Endpointing & VAD

VAD drives decoding decisions and reduces hallucinations:

* Speech start: require ~200ms continuous speech
* Speech end: require ~600–800ms silence

Behavior:

* During silence: stop frequent decoding; keep last partial frozen or clear.
* On end: trigger Pass B, finalize segments, commit aggressively.

---

## 7) Final Transcript Strategy (After Stop)

### Option A (preferred): Full-pass final decode

* Input: saved recording file
* Decode the entire audio with higher quality settings:

  * larger beam
  * best-of
  * allow fallback
* Output: final segments + full concatenated transcript

This provides the highest quality and simplest implementation.

### Option B (optimization): Segment re-decode

* Re-decode each VAD speech region with padding (0.5–1.0s)
* Stitch by timestamps
* Faster, slightly less global context

---

## 8) Model & Backend Support

### Model packaging

* Bundle one or more gguf/ggml Whisper models (tiny/base/small suggested).
* Provide user setting to choose model.

### Backends

* macOS: Metal-enabled whisper.cpp build (ship as separate binary)
* Windows: CUDA build if GPU present; CPU fallback otherwise

(Implementation detail: select sidecar binary at runtime based on OS + GPU availability.)

---

## 9) Public Interfaces (Tauri <-> Backend)

### Events emitted to UI

1. `asr.partial`

```json
{ "text": "...", "t0_ms": 12340, "t1_ms": 15560, "seq": 42 }
```

2. `asr.commit`

```json
{
  "segments": [
    { "t0_ms": 9800, "t1_ms": 12320, "text": "Committed sentence." }
  ],
  "seq": 43
}
```

3. `asr.final_progress`

```json
{ "processed_ms": 120000, "total_ms": 300000 }
```

4. `asr.final_result`

```json
{
  "segments": [
    { "t0_ms": 0, "t1_ms": 2100, "text": "..." }
  ],
  "text": "Full final transcript..."
}
```

### Commands from UI

* `recording.start { settings... }`
* `recording.stop`
* `transcript.export { format }`

---

## 10) Settings & Presets

### Preset: Balanced (default)

* window 12s, step 0.8s, overlap 2s
* Pass A: greedy/small beam
* Pass B: beam 5–10, best-of 3–5
* commit delay 2.5–3.0s

### Preset: Low-latency

* window 8–10s, step 0.5–0.7s, overlap 1.5–2s
* smaller beams

### Preset: High-quality live

* step 1.0s, but more frequent Pass B (or bigger beam)

---

## 11) Data Structures

### Segment type

```rust
struct Segment {
  t0_ms: i64,
  t1_ms: i64,
  text: String,
  // optional:
  confidence: Option<f32>,
  tokens: Option<Vec<u32>>,
}
```

### Transcript state

```rust
struct TranscriptState {
  stable: Vec<Segment>,
  partial: String,
  last_decode_seq: u64,
}
```

---

## 12) Implementation Plan (Phases)

### Phase 1 — Baseline end-to-end

* Audio capture to WAV + ring buffer
* Sidecar whisper.cpp integration (load model once)
* Simple streaming: decode every 0.8s on last 12s window
* UI partial + commit by timestamp rule

(whisper.cpp stream example can be used as reference for real-time cadence, but we will improve chunk stitching. ([GitHub][1]))

### Phase 2 — Quality upgrades (“WhisperFlow-like” feel)

* Add DSP (NS/AGC/resample)
* Add VAD + endpointing gating
* Two-pass decode (partial + refine)
* Better stabilization (optional “unchanged across 2 passes” rule)

### Phase 3 — Final transcript + polish

* Full-pass final transcription after stop
* Progress reporting
* Export formats (txt, json, srt/vtt)
* Settings UI + model selection

---

## 13) Acceptance Criteria

### Live mode

* Updates visible at least every ~1s while speaking.
* Partial line may change; committed lines do not change.
* No continuous hallucinated text during silence (VAD gating works).
* Average perceived latency within 1–2s.

### Final mode

* Final transcript differs from live (better punctuation/word choice) in a noticeable way on typical audio.
* Final transcript returns within reasonable time for chosen model (no hard requirement, but must not freeze UI).

### Performance

* UI thread never blocks.
* Memory stable over long recordings (bounded buffers).

---

## 14) Test Plan

### Unit tests

* Ring buffer correctness under load
* VAD endpoint state machine (start/end transitions)
* Commit rule correctness (no rewriting stable segments)

### Integration tests

* Mock audio input (pre-recorded wav) → live events → final transcript
* Platform runs:

  * macOS Metal path
  * Windows CUDA path (if available)
  * Windows CPU fallback

### UX tests

* Verify flicker: stable transcript doesn’t rewrite.
* Verify silence: no new text for long silence.
* Verify stop → final transcript replaces/overrides live transcript appropriately.

---

## 15) Notes / References

* whisper.cpp provides a naive streaming example sampling mic audio periodically. ([GitHub][1])
* WhisperFlow paper notes whisper.cpp’s simplistic streaming approach and motivates more careful streaming/stitching. ([arXiv][3])
* whisper.cpp decoder fallback / logprob threshold options exist (useful in refine/final modes). ([GitHub][2])

---

## 16) Codex Implementation Prompts (paste-friendly)

Use these as explicit tasks for Codex:

1. “Implement audio capture in Rust with cpal, write to WAV, and feed a lock-free ring buffer of 16k mono frames.”
2. “Implement DSP worker: resample to 16k, AGC normalization, and optional RNNoise/WebRTC NS; output frames to VAD.”
3. “Implement VAD + endpointing state machine (start after 200ms speech, end after 600ms silence).”
4. “Implement ASR worker with sliding window (12s window, 0.8s step, 2s overlap). Keep whisper model loaded.”
5. “Implement two-pass decoding (fast partial each step; refine on endpoint and every 3–4s).”
6. “Implement stabilization: maintain stable segments + partial line; commit segments older than 2.5–3.0s.”
7. “Implement Tauri events (`asr.partial`, `asr.commit`, `asr.final_progress`, `asr.final_result`) and UI wiring.”
8. “On stop recording, run a full-pass offline transcription on saved WAV with higher quality decode settings and publish final result.”

---



[1]: https://github.com/ggerganov/whisper.cpp/blob/master/examples/stream/README.md?utm_source=chatgpt.com "whisper.cpp/examples/stream/README.md at master · ..."
[2]: https://github.com/ggml-org/whisper.cpp/discussions/620?utm_source=chatgpt.com "Is there somewhere more detailed insight on arguments ..."
[3]: https://arxiv.org/pdf/2412.11272?utm_source=chatgpt.com "WhisperFlow: speech foundation models in real time"
