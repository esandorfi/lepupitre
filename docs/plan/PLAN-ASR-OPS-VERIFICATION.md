# Plan: ASR Ops Verification (Cross-Platform)

Status: in_progress  
Owner: ASR maintainers  
Last update: 2026-03-01

## Goal

Provide deterministic, support-friendly verification of ASR sidecar correctness across:
- customer installations
- developer onboarding
- multi-platform environments (Windows/macOS/Linux)

This plan targets both identity verification ("what binary is this?") and runtime verification ("does it decode correctly here?").

## Why now

Current checks are split across scripts and smoke tests, but support/onboarding still misses:
- one-command diagnostics with explicit versions/protocol compatibility
- install-time integrity/provenance checks
- structured support bundle output

## Scope

### 1) Sidecar identity and protocol introspection
- Add `lepupitre-asr --version`.
- Add `lepupitre-asr doctor --json`.
- Include at minimum:
  - sidecar semantic version
  - git commit (if available)
  - target triple
  - build timestamp
  - protocol/schema version
  - whisper/ggml dependency versions

### 2) App-level compatibility gate
- Extend `asr_sidecar_status` to validate sidecar doctor output, not only path existence.
- Report deterministic error codes for:
  - binary missing
  - incompatible protocol
  - unsupported runtime capability

### 3) Integrity verification
- Publish checksums for release binaries.
- Add local verify step against release manifest.
- Keep `scripts/verify-asr-sidecar.mjs` as fast binary sanity check (size/magic/placeholder detection).

### 4) Functional smoke verification
- Keep smoke decode test as required functional check for operations:
  - `just asr-smoke-dev <model-path>`
- Add doctor-mode smoke option for one-command operator diagnostics.

### 5) Support diagnostics bundle
- Add a command to export ASR diagnostics bundle (JSON/text) with:
  - sidecar doctor output
  - model metadata (path/size/hash)
  - app + platform info
  - latest ASR error signatures
- Ensure safe redaction defaults (no transcript/audio payloads).

### 6) CI verification gates
- Add release-artifact verification matrix:
  - run sidecar `--version`
  - run sidecar `doctor --json`
  - run smoke decode with controlled fixture/model setup
- Fail release verification on mismatch/incompatibility.

## Non-goals

- Replacing ASR model download logic.
- Redesigning transcription UX in recorder flows.
- Full remote telemetry/phone-home diagnostics.

## Phased rollout

Execution status (2026-03-01):
- Phase 1 completed: sidecar `--version`, `doctor --json`, and app-side compatibility gate shipped.
- Phase 2 started: support diagnostics bundle command (`asr_diagnostics_export`) shipped with redacted path hints.
- Phase 2 progressed: release CI now runs sidecar doctor contract verification (`scripts/check-asr-sidecar-doctor.mjs`).
- Phase 2 completed: sidecar checksum manifest generate/verify script shipped and release CI publishes checksum manifests.

## Phase 1 (MVP: operator visibility)
1. Implement `--version`.
2. Implement `doctor --json` with stable minimal schema.
3. Add app parsing/validation path in `asr_sidecar_status`.
4. Document command usage in ASR architecture doc.

## Phase 2 (support and trust)
1. Add support bundle command.
2. Add release checksum manifest verification command.
3. Add CI doctor checks on packaged artifacts.

## Phase 3 (hardening)
1. Add runtime compatibility matrix tests.
2. Add provenance/SBOM/signing verification integration in release docs/CI.

## Acceptance criteria

- Any support ticket can provide a single diagnostics output proving:
  - which sidecar binary is running
  - whether it is protocol-compatible with app build
  - whether smoke decode passes locally
- New developer onboarding can validate ASR stack in <5 minutes on each platform.
- Release CI blocks binaries that fail identity/doctor/smoke verification.

## Current anchors

- Binary sanity verifier: `scripts/verify-asr-sidecar.mjs`
- Functional smoke path: `just asr-smoke-dev <model-path>`
- ASR architecture doc: `docs/architecture/asr.md`
