# ADR-OPS-0003 — Tauri release automation (DMG/MSI/EXE) + versioning

## Status
Accepted

## Context
The project must generate macOS and Windows installers reproducibly without relying on a local machine. The release chain must also handle version bumps and produce a per-commit changelog per Codex rules.

## Options considered
### Option A — GitHub Actions + tauri-action + versioning scripts
- Pros:
  - reproducible native OS builds (macOS/Windows)
  - artifacts automatically attached to GitHub releases
  - centralized, coherent versioning (UI/desktop/tauri/Cargo)
- Cons:
  - requires macOS/Windows runners
  - signing/notarization handled via secrets

### Option B — Manual local builds
- Pros:
  - simple to start
- Cons:
  - not reproducible
  - frequent human errors
  - no release traceability

## Decision
Adopt **Option A**:
1. GitHub Actions `Release` workflow with macOS/Windows matrix.
2. Workflow triggered by tag `v*` (draft release) and `workflow_dispatch`.
3. `scripts/release.mjs` to bump versions + tag.

## Consequences
- Installers must be built on native OS (no cross-build).
- Signing/notarization is an additional step to configure (certs + CI secrets).
- Optional distribution via Homebrew/winget needs dedicated tokens and automated or manual updates.

## Divergence (ADR vs codebase)
- Status: Aligned.
- References: `.github/workflows/release-packaging.yml`, `scripts/release.mjs`, `desktop/package.json`.
