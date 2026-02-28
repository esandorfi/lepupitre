# Release Operations

## CI workflows
- CI checks: `.github/workflows/ci.yml`
- Release packaging: `.github/workflows/release-packaging.yml`
- CI is path-aware: docs, UI, and Rust jobs run only when relevant files change (full run on `v*` tags).

## Versioning and changelog
- Version bump + tag:
  - `pnpm -C desktop release:patch`
  - `pnpm -C desktop release:minor`
  - `pnpm -C desktop release:major`
- Auto bump + push:
  - `pnpm -C desktop release:patch:push` (or `minor:push` / `major:push`)
- Changelog update:
  - `pnpm -C desktop changelog`
  - backfill specific version if needed: `pnpm -C desktop changelog -- <version>`

## Packaging flow
- Local packaging: `pnpm -C desktop build`
- On `v*` tags, GitHub Actions builds macOS and Windows artifacts and attaches them to the release.
- ASR packaging invariant: both `lepupitre-asr` and `lepupitre-asr.exe` must be present before Rust/ASR smoke steps.

## Quality gates
- Documentation:
  - `pnpm -C desktop docs:lint`
- Backend:
  - `cargo fmt --all -- --check`
  - `cargo clippy --all-targets --all-features -- -D warnings`
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
- Frontend:
  - `pnpm -C desktop ui:lint`
  - `pnpm -C desktop ui:lint:design`
  - `pnpm -C desktop ui:typecheck`
  - `pnpm -C desktop ui:test`

## Optional distribution automation
- Homebrew cask update (requires `HOMEBREW_TAP_TOKEN`)
- winget update flow (requires `WINGETCREATE_TOKEN`)
- winget first-time bootstrap note: automated `wingetcreate update` works only after an initial manifest exists in `microsoft/winget-pkgs`.

These channels are best-effort and should not block the core release unless explicitly configured as required.

## Winget initial bootstrap (one-time)
Use this once before relying on automated `wingetcreate update` in CI.

Target install UX:
- `winget install lepupitre`
- Fallback canonical command: `winget install --id esandorfi.LePupitre -e`

1. Create a GitHub PAT (classic) with `public_repo`.
2. Install WingetCreate:
   - `winget install --id Microsoft.WingetCreate -e`
3. Set token via environment variable (recommended):
   - PowerShell: `$env:WINGET_CREATE_GITHUB_TOKEN="YOUR_PAT"`
4. Use a release installer URL (prefer `.msi` for first submission).
5. Generate and submit initial manifests:
   - `wingetcreate new "<MSI_URL>" --out .\winget`
   - Use package identifier: `esandorfi.LePupitre`
   - Set the package moniker to `lepupitre` in the generated manifest.
   - Follow prompts to submit PR to `microsoft/winget-pkgs`
6. After the initial PR is merged, CI can run:
   - `wingetcreate update esandorfi.LePupitre --version <version> --urls <installer-url> --submit`
7. Verify install commands:
   - `winget search lepupitre`
   - `winget install lepupitre`
