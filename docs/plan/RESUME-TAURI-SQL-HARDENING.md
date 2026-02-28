# RESUME-TAURI-SQL-HARDENING

Status: ready_to_resume  
Owner: maintainers  
Last updated: 2026-02-28

## Checkpoint snapshot

- Plan source: [PLAN-TAURI-SQL-HARDENING.md](PLAN-TAURI-SQL-HARDENING.md)
- Current phase: Workstream 5 (recovery, backup, operability)
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
- Last known checkpoint commit: `bb0a507` (updated in-progress after this checkpoint)

## Resume goal

Start Workstream 5 by implementing safe local backup/recovery flow around migrations and adding DB health diagnostics.

## Resume checklist (ordered)

1. Pre-flight
- [ ] Rebase/sync with `main`.
- [ ] Run baseline checks:
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
  - `pnpm -C desktop docs:lint`

1. Workstream 5 kickoff
- [x] Define backup trigger points (before migration on pending versions).
- [x] Implement profile/global DB snapshot helper with deterministic naming and retention rules.
- [ ] Add restore path and failure handling for corrupted DB startup scenario.
- [ ] Add diagnostics IPC command/report:
  - schema version
  - migration continuity status
  - `PRAGMA integrity_check`
  - `PRAGMA foreign_key_check`
  - Note: core diagnostics helpers are implemented; IPC exposure remains to do.

1. Guard rails + docs per slice
- [ ] Update [PLAN-TAURI-SQL-HARDENING.md](PLAN-TAURI-SQL-HARDENING.md) progress bullets.
- [ ] If architecture/process rule changes, update:
  - [docs/architecture/overview.md](../architecture/overview.md)
  - [docs/CONTRIBUTION_RULES.md](../CONTRIBUTION_RULES.md)
- [ ] Keep [docs/STATUS.md](../STATUS.md) next-action aligned.

1. Done criteria for Workstream 5
- [ ] Backup/restore flow is implemented and testable.
- [ ] Corruption handling path is deterministic and documented.
- [ ] Diagnostics are available for local support and CI assertions.

## Quick commands

```powershell
cargo fmt --manifest-path desktop/src-tauri/Cargo.toml
cargo test --manifest-path desktop/src-tauri/Cargo.toml
pnpm -C desktop docs:lint
```
