# Plan: Recorder Waveform + UX Polish (Deferred Scope)

Status: in_progress  
Parent: [PLAN-RECORDER-VOICE-MEMO-UX.md](PLAN-RECORDER-VOICE-MEMO-UX.md)

## Execution checkpoint (2026-02-28)

Delivered in this pass:

- A.1 waveform trim UI skeleton in Quick Clean:
  - start/end range handles
  - selected duration preview
  - reset action
  - non-destructive preview-only copy (no backend trim yet)
- UI trim normalization helper + focused unit tests.

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
