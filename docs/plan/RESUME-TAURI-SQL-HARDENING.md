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
  - standardized run-domain module shape to `core/run/{mod.rs,queries.rs,repo.rs,types.rs}`
  - extracted preferences-domain data access from `commands/preferences.rs` to `core/preferences.rs`
  - command layer now wrapper-only for preferences commands
  - standardized preferences-domain module shape to `core/preferences/{mod.rs,queries.rs,repo.rs}`
  - extracted coach-domain data access/read-model logic from `commands/coach.rs` to `core/coach.rs`
  - command layer now wrapper-only for coach commands
- Last known checkpoint commit: `c5a85f8` (updated in-progress after this checkpoint)

## Resume goal

Continue Workstream 4 by removing direct SQL from command wrappers and consolidating data-access logic under `core/<domain>` modules with typed contracts and tests.

## Resume checklist (ordered)

1. Pre-flight
- [ ] Rebase/sync with `main`.
- [ ] Run baseline checks:
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
  - `pnpm -C desktop docs:lint`

1. Slice C: structure standardization
- [x] Normalize run-domain module shape:
  - `queries.rs` for SQL text/builders
  - `repo.rs` for typed DB operations
  - `types.rs` for run DTOs
- [x] Normalize preferences-domain module shape:
  - `queries.rs` for SQL builders
  - `repo.rs` for validation + typed DB operations
- [ ] Normalize coach-domain module shape:
  - `queries.rs` for read SQL text
  - `repo.rs` for typed read-model mapping
  - `types.rs` for coach DTOs (or explicit reuse of domain types)
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
