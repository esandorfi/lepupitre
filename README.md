# Le Pupitre (TTQC) — Human README & onboarding

## 1) What it is
Le Pupitre is a local-first coach for preparing technical talks through short daily quests, longer audio sessions (Boss Run), actionable feedback, and peer review packs via export/import.

## 2) Repo status
The repo contains a working Tauri app under `desktop/` (Rust + Vue).
Features already in place:
- Profiles, talks, quests (text + audio), Boss Run.
- Peer-review pack export and peer feedback import.
- Artifact management and ZIP import validation.

## OSS documentation model
- Public OSS entry docs:
  - `README.md` (project overview + onboarding)
  - `CONTRIBUTING.md` (how to contribute)
  - `CODE_OF_CONDUCT.md` (community expectations)
  - `SECURITY.md` (vulnerability reporting)
- Maintainer/engineering docs:
  - `docs/ARCHITECTURE.md` (architecture and release operations)
  - `docs/` (plans, ADRs, implementation guidance)
- Design-flow docs:
  - `spec/` stores architecture/product/UI design flows used during iteration.
  - `spec/` is intentionally kept as design material and may be moved later to internal technical documentation.

## 3) Coherence review (summary)
### Aligned
- Product vision and enterprise constraints (local-first, offline, secrets).
- Ports/adapters model, migrations, artifacts, and transcription/analysis pipeline.

### Open points to challenge
1. **Pack roadmap**: clarify external review format (template vs final review).

### Release policy (current)
- **v0.2.x policy**: GitHub release artifacts are built and published by CI, but remain unsigned/not notarized.
- **User impact**: macOS Gatekeeper and Windows SmartScreen may show trust warnings.
- **Planned gate**: move to signed/notarized installers in the next distribution hardening cycle, once certificate and notarization credentials are provisioned in CI.

## 4) Quick onboarding (human)
## Prerequisites
- Rust stable
- Node.js LTS
- pnpm or npm
- Tauri v2 toolchain (per OS)
- Local SQLite

### Install prerequisites (Windows/macOS)
Follow official Tauri v2 prerequisites first: https://v2.tauri.app/start/prerequisites/

Windows (PowerShell):
- `winget install --id Rustlang.Rustup -e`
- `winget install --id OpenJS.NodeJS.LTS -e`
- `winget install --id Microsoft.VisualStudio.2022.BuildTools -e`
- Open a new terminal, then:
  - `rustup default stable`
  - `corepack enable`
  - `corepack prepare pnpm@latest --activate`

macOS (Terminal):
- `xcode-select --install`
- Install Homebrew if missing: https://brew.sh
- `brew install rustup-init node`
- `rustup-init -y`
- `source "$HOME/.cargo/env"`
- `corepack enable`
- `corepack prepare pnpm@latest --activate`

Quick checks:
- `rustc --version`
- `node --version`
- `pnpm --version`

Install repo deps and run:
- `pnpm -C desktop install`
- `pnpm -C desktop dev`

## Recommended path (newcomer)
1. Read `README.md` (this document).
2. Read `docs/ARCHITECTURE.md` (architecture details).
3. Read `docs/IMPLEMENTATION_PLAN.md` (incremental, executable plan).
4. Read `docs/CONTRIBUTION_RULES.md` (docs/tests/changelog/ADR rules).
5. Read the mandatory ADRs (`docs/adr/ADR-AUDIO-0001-...` and `docs/adr/ADR-SEC-0002-...`).
6. Open `docs/README.md` for the complete docs map.
7. Open `docs/STATUS.md` for current docs/spec lifecycle state.
8. Open `spec/` for current design-flow references.

## 5) Quality rules (pragmatic SOTA)
- Local-first by design (network off by default).
- Strict IPC contracts (runtime validation in UI + backend).
- Versioned DB migrations and documented irreversibility.
- Secrets kept out of SQLite (keyring/stronghold).
- Tests required per pass.
- Blocking lint in CI for backend and frontend.
- Decision traceability via ADRs.

## 6) Standard dev workflow
1. Pick an item from the plan (`docs/IMPLEMENTATION_PLAN.md`).
2. Implement a minimal vertical slice (back + front wired).
3. Run lint + tests.
4. Update docs/ADR/changelog per the rules.
5. Commit.

## 7) Expected validation commands
- Backend:
  - `cargo fmt --all -- --check`
  - `cargo clippy --all-targets --all-features -- -D warnings`
  - `cargo test --all`
- Frontend:
  - `pnpm -C desktop ui:lint`
  - `pnpm -C desktop ui:typecheck`
  - `pnpm -C desktop ui:test`

## 8) Release & versioning
- Bump version + tag + changelog: `pnpm -C desktop release:patch` (or `minor`/`major`).
- Changelog only (from Git history): `pnpm -C desktop changelog` (optionally `-- <version>`).
- Packaging CI: the `Release` workflow generates `.dmg` (macOS) and `.msi/.exe` (Windows) on native runners.
- Artifacts are attached to a GitHub release when a `v*` tag is pushed.
- Current trust level: unsigned/not notarized installers for `v0.2.x`.
- Open-source Windows signing option: SignPath Foundation (`https://signpath.org/`) can sign OSS builds through GitHub Actions.
- SignPath model note: signing is done remotely via SignPath/HSM; you typically do not manage a local `.pfx` in this flow.
- Open-source macOS note: notarized distribution still requires an Apple Developer account and notarization credentials (paid Apple program).
- For project-owned publisher identity instead, use your own OV/EV code-signing certificate from a CA.

## 9) Documentation rules
- Documentation map: `docs/README.md`
- Documentation lifecycle and archive policy: `docs/DOCS_GOVERNANCE.md`
- Documentation and spec status ledger: `docs/STATUS.md`
- Contribution workflow: `CONTRIBUTING.md`
- Community policy: `CODE_OF_CONDUCT.md`
- Security reporting: `SECURITY.md`
- Contributor process gates: `docs/CONTRIBUTION_RULES.md`
- Agent behavior rules: `docs/CODEX_RULES.md`
