# ADR-ASR-0004: Local Whisper Sidecar, Model Management, and Event Versioning

## Status
Proposed

## Context
We need a local-first live + final transcription experience with whisper.cpp across macOS and Windows.
The app is single-user, single-session for transcription, and must remain maintainable and evolvable.
Live transcript requires low-latency updates and stable segment commits, with a higher-quality pass after stop.
We also need a model lifecycle that starts lightweight (tiny) and allows upgrades (base) later without breaking offline-first expectations.

## Decision
1) **Integration**: Use a whisper.cpp **sidecar** process per OS/arch.
   - Tauri launches the sidecar, communicates via JSON over stdin/stdout.
   - The app keeps the model loaded for the session to avoid re-init overhead.

2) **Model policy**:
   - Bundle **tiny** model for first-run.
   - Offer **base** as a user-initiated download (opt-in network).
   - Store models in app data with checksums and version metadata.

3) **Mode policy**:
   - **Base** defaults to Live + Final.
   - **Tiny** defaults to Auto: run a quick local benchmark to decide Live + Final vs Final only.

4) **Event versioning**:
   - All ASR events are versioned (e.g., `asr.partial.v1`) to enable future evolution.

## Alternatives considered
- **FFI integration**: direct whisper.cpp linking inside Rust.
  - Pros: lower overhead, simpler runtime.
  - Cons: harder cross-platform builds (Metal/CUDA), stricter thread ownership, harder to hot-swap backends.
- **Single bundled model only**:
  - Simpler, but limits quality upgrades and device-tailored performance.
- **Unversioned events**:
  - Faster initially, but risks breaking UI when payloads evolve.

## Consequences
- Sidecar adds an extra binary per OS/arch; packaging and updates are required.
- Model downloads require explicit user action and checksum validation.
- Event versioning adds a small overhead but protects future changes.

## Divergence
**Divergent**. Current implementation uses a mock transcription pipeline and does not run whisper.cpp, lacks sidecar integration, model management, and versioned ASR events.

**Remediation plan**
- MR1: Define event schemas + settings contract, add UI settings placeholders.
- MR2–MR4: Implement capture, VAD, streaming ASR, and event emission.
- MR5–MR6: Add final transcription + model download management.

## References
- `spec/spec_whisper.md`
- `docs/plan/PLAN-WHISPER-LOCAL-TRANSCRIPTION.md`
- `desktop/src-tauri/src/commands/transcription.rs`
