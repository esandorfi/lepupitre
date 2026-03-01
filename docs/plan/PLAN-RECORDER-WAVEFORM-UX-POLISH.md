# Plan: Recorder Waveform + UX Polish (Deferred Scope)

Status: implemented  
Parent: [PLAN-RECORDER-VOICE-MEMO-UX.md](PLAN-RECORDER-VOICE-MEMO-UX.md)

## Execution checkpoint (2026-03-01)

Delivered in this pass:

- A.1 waveform trim UI skeleton in Quick Clean:
  - start/end range handles
  - selected duration preview
  - reset action
  - non-destructive trim controls integrated into Quick Clean flow
- UI trim normalization helper + focused unit tests.
- A.2 backend trim operation implemented:
  - new command `audio_trim_wav(profile_id, audio_artifact_id, start_ms, end_ms)`
  - non-destructive trimmed WAV artifact persisted with metadata links to source artifact
  - command returns new audio artifact info + trimmed duration
- A.3 transcript consistency wiring implemented:
  - applying trim invalidates in-memory transcript state
  - UI requires re-transcription after trim before analyze/export continuation
  - trimmed artifact propagates through existing `saved` flow for quest/boss-run linkage
- B.2 quality-state UX polish implemented:
  - recorder quality hint transitions now use stabilization hysteresis in UI
  - danger states escalate immediately; de-escalation uses hold windows to reduce flicker
  - focused unit tests added for transition timing behavior
- B.1 keyboard shortcut parity check implemented:
  - shortcut routing extracted into `resolveRecorderShortcutAction(...)`
  - recorder component now consumes centralized shortcut decisions
  - focused unit tests added for phase-aware `Space` and `Ctrl/Cmd+Enter` behavior
- B.3 empty/error-state guidance implemented:
  - recorder now exposes explicit sidecar-missing recovery CTA from quick-clean entrypoint
  - model-missing path remains routed to Settings; sidecar-missing path routes to Help
  - missing prerequisites are now actionable from both blocked-message and diagnostics context

### Validation completed

- `pnpm -C desktop ui:typecheck`
- `pnpm -C desktop ui:test`
- `pnpm -C desktop docs:lint`
- `cargo fmt --manifest-path desktop/src-tauri/Cargo.toml --all -- --check`
- `cargo clippy --manifest-path desktop/src-tauri/Cargo.toml --all-targets --all-features -- -D warnings`
- `cargo test --manifest-path desktop/src-tauri/Cargo.toml`

## Goal

Ship the deferred recorder enhancements after the voice-memo baseline:

- waveform trim UX (Quick Clean)
- targeted UX/accessibility polish

## Scope

### A) Waveform trim (new capability)

1. Add trim UI in `quick_clean`:
   - start/end handles
   - duration preview
   - reset trim action
2. Add backend trim operation:
   - non-destructive audio trim to new artifact
   - metadata links to source artifact
3. Keep transcript consistency rules explicit:
   - trimming after transcript generation invalidates transcript linkage
   - require re-transcription if source audio range changes

### B) UX polish

1. Keyboard shortcut parity check:
   - validate context-aware recorder shortcuts against plan expectations
2. Quality-state UX polish:
   - stabilize warning transitions
   - avoid noisy hint flicker
3. Empty/error states:
   - tighten model/sidecar missing guidance from recorder entrypoints

## Non-goals

- Multi-track editing
- Remote capture features
- Broad DSP processing pipeline

## Deliverables

- Trim-capable recorder quick-clean vertical slice (UI + backend + tests)
- Updated recorder UX docs and status ledger entries
- No regressions in current export/analyze pathways

## Validation gate

- `pnpm -C desktop ui:typecheck`
- `pnpm -C desktop ui:test`
- `cargo fmt --manifest-path desktop/src-tauri/Cargo.toml --all -- --check`
- `cargo clippy --manifest-path desktop/src-tauri/Cargo.toml --all-targets --all-features -- -D warnings`
- `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
- `pnpm -C desktop docs:lint`
