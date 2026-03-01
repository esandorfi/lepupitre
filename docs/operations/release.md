# Release Operations

## CI workflows
- CI checks: `.github/workflows/ci.yml`
- Release packaging: `.github/workflows/release-packaging.yml`
- Website deploy: `.github/workflows/pages.yml`
- CI is path-aware: docs, UI, and Rust jobs run only when relevant files change (full run on `v*` tags).
- Release packaging uses explicit trust toggles:
  - `LEPUPITRE_REQUIRE_WINDOWS_SIGNING`
  - `LEPUPITRE_WINDOWS_SIGNING_PROVIDER` (`signpath` or `self-managed`)
  - `LEPUPITRE_REQUIRE_MACOS_NOTARIZATION`
- CI also runs a website build gate when `website/**` changes.

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
- ASR identity contract gate in release CI:
  - `node scripts/verify-asr-sidecar.mjs`
  - `node scripts/check-asr-sidecar-doctor.mjs`
- Release signing preflight:
  - `scripts/check-release-signing.sh` validates required secrets when trust toggles are enabled.
- Release trust verification:
  - Windows (when required): Authenticode signature must be valid on MSI/NSIS installers.
  - macOS (when required): codesign, Gatekeeper assessment, and stapler validation must pass.
- Release notes should include a `Code signing policy` link:
  - [docs/operations/CODE_SIGNING_POLICY.md](CODE_SIGNING_POLICY.md)
- Website publishing:
  - push `website/**` changes to `main`
  - Pages workflow builds Astro, uploads `website/dist`, and deploys via `actions/deploy-pages`
  - repository Pages source must be set to `GitHub Actions`

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

### CI reliability threshold policy
- Reliability gate command: `./scripts/check-db-reliability.sh`
- Threshold rule: each DB reliability group must pass at 100% (any single failed check fails CI).
- Enforced groups:
  - migration matrix continuity/upgrade checks,
  - corruption recovery drills,
  - hot-query/index guard rails.
- Failure logs include direct pointers to:
  - `docs/operations/release.md#database-recovery-runbook`
  - `docs/plan/PLAN-TAURI-SQL-HARDENING.md`

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

## Local DB security policy
- SQLite and snapshot files are local operational data stores, not secret stores.
- Do not persist credentials/tokens/passwords in preferences or DB tables.
- Diagnostics workflow is metadata-only by design; avoid manual SQL dumps unless explicitly required for incident analysis.
- If sharing incident artifacts outside trusted maintainers:
  - prefer diagnostics metadata first,
  - treat backup/corrupted DB files as sensitive user data and redact or avoid sharing.
- Encryption at rest in this phase:
  - no app-level DB encryption layer,
  - rely on host OS full-disk encryption controls for device-level protection.

### Threat model assumptions (current scope)
- In scope:
  - accidental data exposure through logs/runbooks,
  - local filesystem disclosure when backup/corrupted DB artifacts are shared carelessly.
- Out of scope for app-layer mitigation in this phase:
  - host compromise by privileged malware/root user,
  - physical-device attacks without OS-level disk encryption.
- Operator expectations:
  - keep device-level encryption enabled on maintainer machines,
  - share diagnostics metadata before considering DB artifact exchange,
  - treat any exported backup/corrupted DB file as potentially sensitive user content.

## Quality gates
- Documentation:
  - `pnpm -C desktop docs:lint`
- Backend:
  - `cargo fmt --all -- --check`
  - `cargo clippy --all-targets --all-features -- -D warnings`
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
  - `./scripts/check-db-reliability.sh`
- Frontend:
  - `pnpm -C desktop ui:lint`
  - `pnpm -C desktop ui:lint:design`
  - `pnpm -C desktop ui:typecheck`
  - `pnpm -C desktop ui:test`
- Website:
  - `pnpm -C website install`
  - `pnpm -C website build`

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
