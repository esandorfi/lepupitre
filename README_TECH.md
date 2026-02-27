# README_TECH — Architecture and implementation rules

## 1) Target architecture
- **Desktop**: Tauri v2
- **Core**: Rust
- **UI**: Vue 3 + Vite + TypeScript + Vue Router + Nuxt UI + Tailwind
- **Storage**: SQLite (global + per profile) + filesystem artifacts
- **STT**: local whisper.cpp adapter

## 2) Coherence decisions
1. **UI standardized on Vue** (React starterkit variant rejected for spec coherence).
2. **Docs boundary**:
   - `README*` + `docs/` are the OSS-facing source of truth for onboarding, operations, and implementation.
   - `spec/` stores architecture/product/UI design-flow material during iteration and may be moved later to internal technical docs.
3. **Hexagonal architecture** preserved: domain/application/ports/adapters.
4. **No network by default** from the MVP.
5. **Open decisions moved into mandatory ADRs**: ADR-AUDIO-0001 and ADR-SEC-0002 with spikes and exit criteria.

## 2.1 Mandatory ADRs before implementation
- `docs/adr/ADR-AUDIO-0001-normalisation-audio-capture-wav16k.md`
- `docs/adr/ADR-SEC-0002-tauri-capabilities-least-privilege.md`

Shared exit criteria: the “hello quest” app can record a 16k mono WAV into appdata, with no UI access outside the sandbox.

## 3) Backend modules (executable proposal)
- `commands/`: minimal Tauri IPC surface.
- `core/domain`: entities, invariants, IDs.
- `core/application/usecases`: business orchestration.
- `core/ports`: interfaces (`TranscriptionProvider`, `ArtifactStore`, etc.).
- `core/adapters`: sqlite/fs/whisper/zip/secrets/jobs.

## 4) Contracts and versioning
- Versioned JSON schemas (`schemas/*.v1.json`).
- Versioned SQL migrations (`migrations/*`).
- Any contract change => ADR + changelog entry.

## 5) Security baseline
- No generic FS access from UI.
- Task-oriented IPC only.
- ZIP import validation (path traversal + size limits).
- Secrets via keyring/stronghold, never stored in SQLite.

## 6) Tests and lint (mandatory gates)
## Backend
- format: `cargo fmt --all -- --check`
- lint: `cargo clippy --all-targets --all-features -- -D warnings`
- tests: `cargo test --all`
- ASR smoke (opt-in, requires sidecar + model): `./scripts/asr-smoke.sh /path/to/lepupitre-asr /path/to/ggml-*.bin`
  - Or set env vars and run: `LEPUPITRE_ASR_SMOKE=1 LEPUPITRE_ASR_SIDECAR=... LEPUPITRE_ASR_MODEL_PATH=... cargo test --manifest-path desktop/src-tauri/Cargo.toml asr_sidecar_smoke_decode`

## Frontend
- lint: `pnpm -C desktop ui:lint`
- types: `pnpm -C desktop ui:typecheck`
- tests: `pnpm -C desktop ui:test`

## 6.1 Local dev quickstart
1. Install platform prerequisites.
   - Official Tauri v2 prerequisites (required): https://v2.tauri.app/start/prerequisites/
   - Windows (PowerShell):
     - `winget install --id Rustlang.Rustup -e`
     - `winget install --id OpenJS.NodeJS.LTS -e`
     - `winget install --id Microsoft.VisualStudio.2022.BuildTools -e`
     - Open a new terminal, then:
       - `rustup default stable`
       - `corepack enable`
       - `corepack prepare pnpm@latest --activate`
   - macOS (Terminal):
     - `xcode-select --install`
     - Install Homebrew if missing: https://brew.sh
     - `brew install rustup-init node`
     - `rustup-init -y`
     - `source "$HOME/.cargo/env"`
     - `corepack enable`
     - `corepack prepare pnpm@latest --activate`
2. Verify toolchain.
   - `rustc --version`
   - `node --version`
   - `pnpm --version`
3. Install project dependencies.
   - `pnpm -C desktop install`
4. Run the app.
   - Desktop app (Tauri): `pnpm -C desktop dev`
   - UI only (browser): `pnpm -C desktop ui:dev`

## Minimal E2E
- Profile creation -> project creation -> text quest submission -> feedback displayed.

## 7) Release & packaging
- Local build: `pnpm -C desktop build` (macOS => `.dmg`, Windows => `.msi/.exe`).
- Changelog: `pnpm -C desktop changelog` (or `node scripts/changelog.mjs <version>`).
- If the latest Git tag is missing in `CHANGELOG.md`, backfill it first: `pnpm -C desktop changelog -- <tag-version>`.
- CI release: `.github/workflows/release-packaging.yml` (macOS/Windows matrix).
- Current signing policy (v0.2.x): artifacts are built and attached to releases unsigned/not notarized.
- Planned hardening gate: enable macOS notarization and Windows code signing once CI secrets and certificates are provisioned.
- Versioning: `pnpm -C desktop release:patch|minor|major` updates `package.json`, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`, and creates a `vX.Y.Z` tag.
- Tag flow (CLI, precise):
  1. Automated bump + commit + push (recommended):
     - `pnpm -C desktop release:patch:push` (or `release:minor:push`, `release:major:push`)
     - This creates the tag and pushes both commit + tag to GitHub.
  2. Manual alternative:
     - `pnpm -C desktop release:patch`
     - `git add -A && git commit -m "chore(release): vX.Y.Z"`
     - `git push origin <branch> && git push origin vX.Y.Z`
     - To push all local tags: `git push origin --tags`
  - The DMG name follows `productName` (set to `LePupitre` in `tauri.conf.json`).
  - The workflow attaches built installers to the tag release as draft assets.
  - ASR sidecar packaging invariant: both `sidecar/lepupitre-asr` and `sidecar/lepupitre-asr.exe` resource paths must exist in CI before Rust/ASR smoke tests.
- CI secrets (optional):
  - `HOMEBREW_TAP_TOKEN` for pushing cask updates.
  - `WINGETCREATE_TOKEN` for submitting winget updates.
### Token setup (GitHub)
- `HOMEBREW_TAP_TOKEN`:
  - Fine-grained PAT with access to `esandorfi/homebrew-lepupitre`.
  - Permissions: Contents (read/write).
- `WINGETCREATE_TOKEN`:
  - PAT with access to your fork of `microsoft/winget-pkgs`.
  - Permissions: Contents (read/write) + Pull requests (read/write).
  - Ensure the fork exists at `esandorfi/winget-pkgs`.
### Optional distribution (Homebrew + winget)
- Homebrew (macOS):
  - Tap repo: `esandorfi/homebrew-lepupitre`.
  - Cask: `Casks/lepupitre.rb` pointing to the GitHub release `.dmg`, with `version` and `sha256`.
  - CI can update the cask automatically when a tag release is published.
- winget (Windows):
  - Package ID: `esandorfi.LePupitre`.
  - Use `wingetcreate update` to submit a PR to `microsoft/winget-pkgs` with the new `.msi/.exe` URL and SHA256.
  - CI automation uses a GitHub token; otherwise keep it manual.

## 8) Local observability
- Structured JSON logs in dev.
- Correlate IDs via `job_id` for transcription/analysis.
- Normalized UI errors (`IPC_INVALID_*`, `IPC_COMMAND_FAILED`, etc.).

## 9) Scale-up plan
- Stable offline MVP.
- Then opt-in remote STT.
- Then opt-in cloud sync.
Each step must preserve local data compatibility.

## 10) Feature plans
- Whisper local transcription: `docs/plan/PLAN-WHISPER-LOCAL-TRANSCRIPTION.md`.


## ASR sidecar (whisper.cpp)

- Installer builds (`.dmg`, `.msi`, `.exe`) ship the ASR sidecar by default.
- Whisper models are not bundled; users download a model explicitly from Settings (`tiny` or `base`).

## Dev ASR sidecar (local)
- Build the sidecar locally: `./scripts/build-asr-sidecar.sh`
- Configure env vars:
  - `LEPUPITRE_ASR_SIDECAR=/absolute/path/to/lepupitre-asr`
  - `LEPUPITRE_ASR_MODEL_PATH=/absolute/path/to/ggml-*.bin`
- Or use helper script: `./scripts/dev-asr-env.sh /path/to/ggml-tiny.bin`
- Run app: `pnpm -C desktop dev`

## Packaging and validation
- Copy the built sidecar into package resources: `./scripts/build-asr-sidecar.sh --copy`
- Verify sidecar binary is real (not placeholder): `node scripts/verify-asr-sidecar.mjs`
- `pnpm -C desktop build` runs sidecar verification automatically before `tauri build`.

## ASR troubleshooting
- `sidecar_missing`: installation is incomplete/corrupted; reinstall the app.
- `model_missing`: selected model is not installed; download it in Settings.
- `sidecar_init_timeout` / `sidecar_decode_timeout`: sidecar is slow or unresponsive; try a smaller model or shorter audio.
