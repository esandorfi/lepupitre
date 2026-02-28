# Resume Plan: Recorder Voice-Memo UX

Last checkpoint: 2026-02-28
Source plan: [PLAN-RECORDER-VOICE-MEMO-UX.md](PLAN-RECORDER-VOICE-MEMO-UX.md)
Status: completed (resume checklist closed)

## Current state

- Core 3-phase recorder UX is implemented and validated:
  - `capture`
  - `quick_clean`
  - `analyze_export`
- Transcript edit save path is implemented end-to-end.
- Quest/Boss Run integration uses recorder-driven transcript selection for analysis.
- Recorder telemetry is now push-first via `recording/telemetry/v1` with compatibility fallback polling.
- Recorder microcopy is i18n-aligned across EN/FR for the new phase/panel labels.
- Focused recorder regression tests now cover flow decisions and backend quality/metadata contracts.

## Recommended next slice (resume here)

### 1) Replace recorder polling with pushed telemetry event (completed 2026-02-28)

Delivered:

- Backend event `recording/telemetry/v1` emitted during recording with:
  - `durationMs`
  - `level`
  - `isClipping`
  - `signalPresent`
  - `qualityHintKey`
- UI recorder now subscribes to telemetry and updates timer/quality from event stream.
- Polling fallback is armed only if telemetry is not received within a short grace window.
- IPC schema/test coverage added for telemetry payload validation.

### 2) Microcopy/i18n completion for new recorder labels (completed 2026-02-28)

Delivered:

- Replaced recorder hardcoded user-facing strings with i18n keys in:
  - `AudioRecorder`
  - `RecorderCapturePanel`
  - `RecorderQuickCleanPanel`
  - `RecorderExportPanel`
  - `RecorderAdvancedDrawer`
- Added EN/FR key parity for:
  - phase labels
  - quality labels
  - quick-clean actions
  - export preset labels
  - utility labels and recorder announcements
- Advanced drawer labels now reuse existing transcription settings vocabulary keys.

### 3) Add focused contract tests for new behavior (completed 2026-02-28)

Delivered:

- UI flow helper tests:
  - stop transition keeps phase at `quick_clean` and gates auto-transcribe decision
  - edited transcript ID is preferred for analysis/export selection
  - typing target detection guards keyboard shortcuts while editing
- Rust tests:
  - transcript edit metadata includes source-link fields
  - quality hint precedence transitions (`no_signal` > `too_loud` > `noisy_room` > `too_quiet` > `good_level`)

Validation:

- `pnpm -C desktop ui:typecheck`
- `pnpm -C desktop ui:test`
- `cargo fmt --manifest-path desktop/src-tauri/Cargo.toml --all -- --check`
- `cargo clippy --manifest-path desktop/src-tauri/Cargo.toml --all-targets --all-features -- -D warnings`
- `cargo test --manifest-path desktop/src-tauri/Cargo.toml`

## Next suggested slice

- Follow deferred scope plan:
  - [PLAN-RECORDER-WAVEFORM-UX-POLISH.md](PLAN-RECORDER-WAVEFORM-UX-POLISH.md)

## Quick restart commands

From repository root:

- Install deps in this worktree: `pnpm -C desktop install`
- Docs lint: `pnpm -C desktop docs:lint`
- UI gates:
  - `pnpm -C desktop ui:lint`
  - `pnpm -C desktop ui:typecheck`
  - `pnpm -C desktop ui:test`
- Backend gates:
  - `cargo fmt --manifest-path desktop/src-tauri/Cargo.toml --all -- --check`
  - `cargo clippy --manifest-path desktop/src-tauri/Cargo.toml --all-targets --all-features -- -D warnings`
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
