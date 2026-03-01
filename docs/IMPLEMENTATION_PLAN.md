# Implementation Plan

Snapshot date: 2026-03-01

This is the active execution plan. Historical planning material should be archived.
This file is not documentation governance; governance rules live in `docs/DOCS_GOVERNANCE.md`.

## Current baseline (already delivered)
- Local-first Tauri desktop app (`desktop/`) with Rust + Vue.
- Core workflow: profiles/workspaces, talks, quests (text/audio), feedback, Boss Run.
- ASR sidecar integration and model management.
- Release packaging workflow for macOS and Windows.
- Onboarding/help pages and core logic-contract test coverage for UI redesign safety.

## Active priorities

## Track A: Distribution hardening (release trust)
Goal: signed and trusted installers.

Scope:
- Windows signing workflow (SignPath if eligible, or project-owned certificate).
- macOS signing + notarization workflow with Apple credentials.
- CI gate: release jobs fail if signing/notarization requirements are configured but not met.

Done when:
- Windows artifacts are signed in release CI.
- macOS artifacts are signed and notarized in release CI.
- Documentation and release runbook are updated.

## Track B: UI redesign with stable logic contracts
Goal: allow major UI changes while preserving behavior.

Scope:
- Keep existing logic contracts tested (routing, breadcrumbs/context retention, progression guardrails, ASR settings/error mapping, IPC schema alignment).
- Continue visual/IA redesign from active specs.
- Prevent regressions through test-first updates on logic modules.

Done when:
- UI can evolve without breaking contract tests.
- Any intentional contract change updates tests and docs in the same PR.

## Track C: ASR robustness and CI reliability
Goal: predictable ASR behavior across platforms and CI.

Scope:
- Keep sidecar resource checks deterministic on Windows/macOS CI.
- Maintain ASR smoke tests as opt-in but reliable when enabled.
- Tighten error handling paths (`sidecar_missing`, `model_missing`, timeouts).
- Add ops verification primitives (`--version`, `doctor --json`, support diagnostics bundle).

Execution detail:
- [docs/plan/PLAN-ASR-OPS-VERIFICATION.md](plan/PLAN-ASR-OPS-VERIFICATION.md)

Done when:
- Release and smoke-test CI runs are stable.
- ASR failure modes are deterministic in UI and logs.
- ASR operator diagnostics are one-command and deterministic across supported platforms.

## Track D: SQLite architecture hardening (Tauri backend)

Goal: SOTA-grade local database reliability with easy long-term maintenance.

Scope:
- Apply SQLite baseline posture at open (`WAL`, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout`).
- Replace runtime schema drift patches with ordered, tracked migrations.
- Add explicit foreign keys and transactional integrity for multi-step mutations.
- Move SQL from Tauri commands into table-oriented DB modules/handles.
- Add corruption recovery behavior and migration continuity checks.
- Add backup and restore workflow around risky migration steps.
- Add CI corruption drills with fixture databases and recovery assertions.
- Add performance guardrails for hot queries and index coverage.
- Add security hardening for local data handling (no secrets in SQLite; encryption policy decision).
- Add structured local DB health diagnostics (version, integrity, migration status).

Execution detail:
- [docs/plan/PLAN-TAURI-SQL-HARDENING.md](plan/PLAN-TAURI-SQL-HARDENING.md)

Done when:
- Deterministic migration path is enforced and continuity is validated.
- FK constraints and transaction boundaries protect all critical write flows.
- Corruption handling, backup/restore, and DB health diagnostics are implemented and documented.
- CI covers migration upgrade, corruption recovery, and hot-path query checks.

## Track E: UI preferences storage policy
Goal: converge from browser `localStorage` to a Tauri-oriented preferences layer.

Scope:
- Define a single typed preferences service used by UI modules.
- Add migration from legacy `localStorage` keys.
- Provide a documented fallback path and failure behavior.

Execution detail:
- [docs/plan/PLAN-UI-PREFERENCES-STORAGE.md](plan/PLAN-UI-PREFERENCES-STORAGE.md)

Done when:
- `localStorage` direct access is removed from feature code.
- Preferences persistence follows the agreed Tauri architecture.
- ADR and runbook updates describe the policy and migration.

## Track F: Living-spec test guard rails
Goal: keep core product behavior stable while UI changes rapidly.

Scope:
- Define a product use-case test matrix as canonical source of test obligations.
- Add command-level integration tests for critical backend flows (workspace/talk/quest/run/feedback/pack).
- Add CI guard rails that require matching tests when core domain files change.
- Add coverage thresholds on stable logic layers (UI `lib/*`, Rust `core/*`) only.
- Keep tests readable as specification (Given/When/Then naming and domain contracts).

Execution detail:
- [docs/testing/TEST_MATRIX.md](testing/TEST_MATRIX.md)
- `scripts/check-test-obligations.sh`

Done when:
- Core use-cases have deterministic tests at logic and command integration levels.
- CI blocks domain changes that bypass required test obligations.
- Test files are navigable as product specifications.

## Track G: Domain-aligned code organization
Goal: align Rust and UI code layout with product bounded contexts for readability and maintainability.

Scope:
- Define bounded contexts and ownership map (workspace, talks, training/quest, runs/feedback, packs/reviews, ASR, preferences).
- Introduce domain-oriented directory layout in Rust and UI incrementally.
- Reduce monolithic orchestration files by extracting domain services/modules.
- Add structural guard rails (path conventions, file-size budgets, dependency direction rules).

Execution detail:
- [docs/plan/PLAN-DOMAIN-CODE-ALIGNMENT.md](plan/PLAN-DOMAIN-CODE-ALIGNMENT.md)

Done when:
- New code lands in domain-aligned modules by default.
- Legacy monolith files are reduced to orchestration boundaries.
- Architecture docs and CI guard rails enforce the agreed structure.

## Track H: Recorder-first voice UX and audio quality
Goal: make recording the first successful action while keeping native desktop audio reliability.

Scope:
- Add a first-class `Quick record` entrypoint in shell navigation.
- Keep recording independent from Whisper model availability (record now, transcribe later).
- Simplify default quick-clean flow (trim as advanced capability, not first cognitive step).
- Add live waveform visualization and in-page playback in recorder flows.
- Define a creative waveform visual system (multiple styles) with strict performance budgets.
- Add deterministic microphone/device quality guidance (low level/clipping/noise) with clear actions.
- Preserve Tauri-native architecture constraints:
  - Rust-native capture/processing remains source of truth.
  - IPC carries lightweight visualization payloads, never raw PCM stream frames.

Execution detail:
- [docs/plan/PLAN-RECORDER-AUDIO-SOTA.md](plan/PLAN-RECORDER-AUDIO-SOTA.md)

Done when:
- First-time users can record immediately from primary nav and review playback without ASR prerequisites.
- Recorder feedback is stable (meter/waveform/quality hints) and maps to deterministic remediation actions.
- Recording data flow remains performant on Windows/macOS without high-frequency IPC bottlenecks.

## Working rules for this plan
- Keep this file short and current.
- Move deep technical plans to `docs/plan/PLAN-*.md`.
- If a track is completed or abandoned, update this file and `docs/STATUS.md` in the same PR.
