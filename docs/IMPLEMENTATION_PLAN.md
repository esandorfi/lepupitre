# Implementation Plan

Snapshot date: 2026-02-27

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

Done when:
- Release and smoke-test CI runs are stable.
- ASR failure modes are deterministic in UI and logs.

## Working rules for this plan
- Keep this file short and current.
- Move deep technical plans to `docs/plan/PLAN-*.md`.
- If a track is completed or abandoned, update this file and `docs/STATUS.md` in the same PR.
