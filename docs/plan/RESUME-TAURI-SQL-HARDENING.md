# RESUME-TAURI-SQL-HARDENING

Status: ready_to_resume  
Owner: maintainers  
Last updated: 2026-02-28

## Checkpoint snapshot

- Plan source: [PLAN-TAURI-SQL-HARDENING.md](PLAN-TAURI-SQL-HARDENING.md)
- Current phase: Workstream 4 (data-access module boundaries)
- Last completed slice:
  - extracted run-domain data access from `commands/run.rs` to `core/run.rs`
  - command layer now wrapper-only for run commands
  - extracted preferences-domain data access from `commands/preferences.rs` to `core/preferences.rs`
  - command layer now wrapper-only for preferences commands
  - extracted coach-domain data access/read-model logic from `commands/coach.rs` to `core/coach.rs`
  - command layer now wrapper-only for coach commands
- Last known checkpoint commit: `eebdfca` (updated in-progress after this checkpoint)

## Resume goal

Continue Workstream 4 by removing direct SQL from command wrappers and consolidating data-access logic under `core/<domain>` modules with typed contracts and tests.

## Resume checklist (ordered)

1. Pre-flight
- [ ] Rebase/sync with `main`.
- [ ] Run baseline checks:
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
  - `pnpm -C desktop docs:lint`

1. Slice C: structure standardization
- [ ] Normalize module shape for migrated domains:
  - `queries.rs` for SQL text/builders
  - `repo.rs` for typed DB operations
  - typed structs in `types.rs` (or existing domain models)
- [ ] Ensure command wrappers contain no direct SQL after each slice.

1. Guard rails + docs per slice
- [ ] Update [PLAN-TAURI-SQL-HARDENING.md](PLAN-TAURI-SQL-HARDENING.md) progress bullets.
- [ ] If architecture/process rule changes, update:
  - [docs/architecture/overview.md](../architecture/overview.md)
  - [docs/CONTRIBUTION_RULES.md](../CONTRIBUTION_RULES.md)
- [ ] Keep [docs/STATUS.md](../STATUS.md) next-action aligned.

1. Done criteria for Workstream 4
- [ ] Critical command modules no longer contain direct SQL mutation/query logic.
- [ ] Domain DB modules own typed access contracts and tests.
- [ ] CI/test/docs checks pass.

## Quick commands

```powershell
cargo fmt --manifest-path desktop/src-tauri/Cargo.toml
cargo test --manifest-path desktop/src-tauri/Cargo.toml
pnpm -C desktop docs:lint
```
