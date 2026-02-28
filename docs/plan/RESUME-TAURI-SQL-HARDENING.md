# RESUME-TAURI-SQL-HARDENING

Status: ready_to_resume  
Owner: maintainers  
Last updated: 2026-02-28

## Checkpoint snapshot

- Plan source: [PLAN-TAURI-SQL-HARDENING.md](PLAN-TAURI-SQL-HARDENING.md)
- Current phase: Workstream 6 (reliability gates in CI)
- Last completed slice:
  - extracted run-domain data access from `commands/run.rs` to `core/run.rs`
  - command layer now wrapper-only for run commands
  - standardized run-domain module shape to `core/run/{mod.rs,queries.rs,repo.rs,types.rs}`
  - extracted preferences-domain data access from `commands/preferences.rs` to `core/preferences.rs`
  - command layer now wrapper-only for preferences commands
  - standardized preferences-domain module shape to `core/preferences/{mod.rs,queries.rs,repo.rs}`
  - extracted coach-domain data access/read-model logic from `commands/coach.rs` to `core/coach.rs`
  - command layer now wrapper-only for coach commands
  - standardized coach-domain module shape to `core/coach/{mod.rs,queries.rs,repo.rs,types.rs}`
  - added pre-migration snapshot creation + retention in `core/db.rs`
  - added DB diagnostics helpers (`DbDiagnostics`, `global_diagnostics`, `profile_diagnostics`) in `core/db.rs`
  - added startup corruption recovery (quarantine + restore from latest snapshot) in `core/db.rs`
  - added diagnostics IPC command `profile_db_diagnostics` (global + optional profile)
  - documented operator restore workflow and `db_recovery_no_snapshot` handling in operations docs
  - added DB reliability CI gate script (`scripts/check-db-reliability.sh`) and workflow wiring
  - added migration/corruption/query-plan/index reliability assertions in `core/db.rs` tests
- Last known checkpoint commit: `6329245` (updated in-progress after this checkpoint)

## Resume goal

Continue Workstream 6 by finalizing CI failure thresholds and explicit runbook linking for DB reliability failures.

## Resume checklist (ordered)

1. Pre-flight
- [ ] Rebase/sync with `main`.
- [ ] Run baseline checks:
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
  - `pnpm -C desktop docs:lint`

1. Workstream 6 kickoff
- [x] Add migration matrix CI checks:
  - fresh install schema path
  - upgrade path from older fixture DBs
- [x] Add corruption drill CI checks:
  - corrupted DB fixture
  - snapshot restore assertion
  - deterministic `db_recovery_no_snapshot` failure assertion
- [x] Add hot query guard rails:
  - query-plan assertions for key reads/writes
  - index presence checks for expected paths
- [ ] Define CI failure thresholds and runbook links for DB reliability failures.

1. Guard rails + docs per slice
- [ ] Update [PLAN-TAURI-SQL-HARDENING.md](PLAN-TAURI-SQL-HARDENING.md) progress bullets.
- [ ] If architecture/process rule changes, update:
  - [docs/architecture/overview.md](../architecture/overview.md)
  - [docs/CONTRIBUTION_RULES.md](../CONTRIBUTION_RULES.md)
- [ ] Keep [docs/STATUS.md](../STATUS.md) next-action aligned.

1. Done criteria for Workstream 6
- [x] CI blocks migration continuity and corruption-recovery regressions.
- [x] Hot-path query plans and index expectations are enforced.
- [ ] Reliability failures are diagnosable from CI logs + runbook references.

## Quick commands

```powershell
cargo fmt --manifest-path desktop/src-tauri/Cargo.toml
cargo test --manifest-path desktop/src-tauri/Cargo.toml
pnpm -C desktop docs:lint
```
