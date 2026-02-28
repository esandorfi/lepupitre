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

## Database upgrade behavior
- Installer/package updates do not run SQL migrations directly.
- Migrations run inside the app at runtime:
  - `global.db` migrates when global storage is opened,
  - `profile.db` migrates when a profile is opened.
- Resulting user behavior:
  - first app open after update applies pending global migrations,
  - each profile is upgraded on first access after update.

## Database recovery runbook
### Automatic behavior at startup
- On DB open, the app verifies DB health (`PRAGMA quick_check`) before migrations.
- If DB open/integrity fails:
  - current DB files are quarantined under `corrupted/`,
  - latest matching snapshot from `backups/` is restored,
  - if no snapshot exists, startup fails with `db_recovery_no_snapshot`.

### Storage locations
- Global DB:
  - database: `<appData>/global.db`
  - snapshots: `<appData>/backups/`
  - quarantined files: `<appData>/corrupted/`
- Profile DB:
  - database: `<appData>/profiles/<profileId>/profile.db`
  - snapshots: `<appData>/profiles/<profileId>/backups/`
  - quarantined files: `<appData>/profiles/<profileId>/corrupted/`

### Snapshot policy
- Snapshots are created automatically before pending migrations on existing DBs.
- Snapshot naming: `<db>-<scope>-pre-<next-migration>-<timestamp>.db`.
- Retention keeps the newest 5 snapshots per DB scope.

### Operator triage steps
1. Capture the failing error string and timestamp (`db_recovery_no_snapshot` or recovery-related open error).
1. Collect diagnostics (global + optional profile):

```ts
import { invoke } from '@tauri-apps/api/core'

const report = await invoke('profile_db_diagnostics', { profileId: 'prof_xxx' })
```

1. If `db_recovery_no_snapshot`, close the app, inspect `corrupted/` for quarantined DB files, restore a known-good `.db` from `backups/` to the active DB path, then relaunch and re-run diagnostics.
1. If no valid backup exists, keep quarantined DB files for forensic analysis and initialize a fresh DB by relaunching the app (data loss for the affected DB scope).

### Incident artifacts to keep
- Quarantined DB files from `corrupted/`.
- Selected restored snapshot filename.
- `profile_db_diagnostics` output before/after restore.
- App version and migration checkpoint (`latestMigration` / `schemaVersion`).

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
