# Le Pupitre (TTQC) — Human README & onboarding

## 1) What it is
Le Pupitre is a local-first coach for preparing technical talks through short daily quests, longer audio sessions (Boss Run), actionable feedback, and peer review packs via export/import.

## 2) Repo status
The repo contains a working Tauri app under `desktop/` (Rust + Vue).
Features already in place:
- Profiles, talks, quests (text + audio), Boss Run.
- Peer-review pack export and peer feedback import.
- Artifact management and ZIP import validation.

Specs remain the source of reference:
- `spec/spec_lepupitre.md` (product + backend + security + architecture)
- `spec/spec_ui.md` (UI spec Vue/Nuxt UI)

## 3) Coherence review (summary)
### Aligned
- Product vision and enterprise constraints (local-first, offline, secrets).
- Ports/adapters model, migrations, artifacts, and transcription/analysis pipeline.

### Open points to challenge
1. **Release/signing**: decide the signing/notarization policy for macOS/Windows.
2. **Pack roadmap**: clarify external review format (template vs final review).

## 4) Quick onboarding (human)
## Prerequisites
- Rust stable
- Node.js LTS
- pnpm or npm
- Tauri v2 toolchain (per OS)
- Local SQLite

## Recommended path (newcomer)
1. Read `README.md` (this document).
2. Read `README_TECH.md` (architecture details).
3. Read `docs/IMPLEMENTATION_PLAN.md` (incremental, executable plan).
4. Read `docs/CODEX_RULES.md` (docs/tests/changelog/ADR rules).
5. Read the mandatory ADRs (`docs/adr/ADR-AUDIO-0001-...` and `docs/adr/ADR-SEC-0002-...`).
6. Open `spec/` for contracts and full spec detail.

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

## 9) Documentation rules
See `docs/CODEX_RULES.md` for ADR, testing, and response format rules.
