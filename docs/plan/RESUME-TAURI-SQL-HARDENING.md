# RESUME-TAURI-SQL-HARDENING

Status: ready_to_resume  
Owner: maintainers  
Last updated: 2026-02-28

## Checkpoint snapshot

- Plan source: [PLAN-TAURI-SQL-HARDENING.md](PLAN-TAURI-SQL-HARDENING.md)
- Current phase: Workstream 7 (security posture)
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
  - defined CI threshold policy + runbook-linked failure output for DB reliability gate
- Last known checkpoint commit: `d852493` (updated in-progress after this checkpoint)

## Resume goal

Start Workstream 7 by finalizing local SQL security posture policy and enforcement checks.

## Resume checklist (ordered)

1. Pre-flight
- [ ] Rebase/sync with `main`.
- [ ] Run baseline checks:
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
  - `pnpm -C desktop docs:lint`

1. Workstream 7 kickoff
- [ ] Define explicit local-data security policy:
  - secrets boundary (no secrets in SQLite)
  - backup/diagnostics data handling expectations
  - encryption-at-rest decision for current scope
- [ ] Add enforceable checks or tests for security boundary assumptions.
- [ ] Document threat model and operator expectations for local DB artifacts.

1. Guard rails + docs per slice
- [ ] Update [PLAN-TAURI-SQL-HARDENING.md](PLAN-TAURI-SQL-HARDENING.md) progress bullets.
- [ ] If architecture/process rule changes, update:
  - [docs/architecture/overview.md](../architecture/overview.md)
  - [docs/CONTRIBUTION_RULES.md](../CONTRIBUTION_RULES.md)
- [ ] Keep [docs/STATUS.md](../STATUS.md) next-action aligned.

1. Done criteria for Workstream 7
- [ ] Security policy is explicit and implemented for current local-first scope.
- [ ] Backup/diagnostics workflows avoid accidental sensitive-data leakage.
- [ ] Security constraints are validated by tests/checks and reflected in runbooks.

## Quick commands

```powershell
cargo fmt --manifest-path desktop/src-tauri/Cargo.toml
cargo test --manifest-path desktop/src-tauri/Cargo.toml
pnpm -C desktop docs:lint
```
