# PLAN-TAURI-SQL-HARDENING

Status: in_progress  
Owner: maintainers  
Last updated: 2026-02-28

## Objective

Align LePupitre's Tauri + SQLite backend with a SOTA desktop data architecture:
- reliable under contention and corruption scenarios,
- deterministic across migration history,
- easy to evolve and test.

## Chosen data-access strategy

- Keep `rusqlite` as the DB driver for this plan.
- Do not introduce a `sqlx` migration during hardening.
- Reduce SQL spread with per-domain DB modules:
  - `core/<domain>/repo.rs`: typed DB access functions,
  - `core/<domain>/queries.rs`: SQL text + query builders,
  - typed DB row/result structs in `types.rs` (or existing typed modules).
- Keep raw SQL where it is strongest:
  - reporting queries,
  - complex joins,
  - performance hotspots.
- Keep command files orchestration-only and SQL-free.

### SQL centralization pattern (v1)

- Per bounded context (`workspace`, `talk`, `quest`, `feedback`, `pack`):
  - `core/<context>/queries.rs`
  - `core/<context>/repo.rs`
  - typed row/result structs in `core/<context>/types.rs` (or existing typed modules)
- Rules:
  - `queries.rs` holds SQL text and query builders only.
  - `repo.rs` maps rows and exposes typed functions used by domain services/commands.
  - command modules call domain/repo functions; they do not define SQL.
- Keep raw SQL for:
  - reporting queries,
  - complex joins,
  - performance-critical paths with explicit query-plan checks.

## Non-goals (current phase)

- Full DB watcher architecture refactor across all UI flows.
- Optional cache DB split unless a concrete feature requires it.

## Workstream 1: baseline connection posture

Scope:
- Apply and verify at open time:
  - `PRAGMA journal_mode = WAL`
  - `PRAGMA synchronous = NORMAL`
  - `PRAGMA foreign_keys = ON`
  - `busy_timeout`
- Keep behavior consistent for global and profile DBs.

Acceptance:
- Startup checks confirm effective pragma state.
- Existing runtime behavior is unchanged for users.

## Workstream 2: migration engine and continuity

Scope:
- Introduce migration tracking table (`schema_migrations`).
- Move runtime `ensure_*` schema patches to ordered SQL migrations.
- Validate continuity (no skipped/out-of-order migrations).
- Fail with explicit domain errors on incompatible history.

Acceptance:
- Fresh and upgraded databases converge to the same schema.
- Upgrade path is deterministic and test-covered.

## Workstream 3: relational integrity and transactions

Scope:
- Add explicit foreign key constraints for core relations.
- Define `ON DELETE` and `ON UPDATE` behavior per relation.
- Enforce explicit transaction boundaries for all multi-step writes.
- Add rollback tests for partial-failure scenarios.

Acceptance:
- Invalid references are blocked by schema constraints.
- No partial writes remain on injected failure paths.

## Workstream 4: data-access module boundaries

Scope:
- Extract SQL from command handlers into domain DB modules.
- Move SQL out of mixed domain files into `queries.rs` per domain.
- Move row mapping and typed return contracts into `repo.rs`/typed structs.
- Keep command layer focused on orchestration and error mapping.
- Add table-level tests for read/write semantics.

Acceptance:
- Critical command modules no longer contain direct mutation SQL.
- Domain repo/query modules carry their own tests and typed contracts.

## Workstream 5: recovery, backup, and operability

Scope:
- Add corruption handling (quarantine broken DB and recover safely).
- Add pre-migration backup/snapshot for risky changes.
- Define restore workflow and operator guidance.
- Add local structured diagnostics:
  - schema version,
  - migration state,
  - integrity check result,
  - FK check result.

Acceptance:
- Corrupted DB scenario follows documented recovery flow.
- Backup/restore is testable and documented in operations docs.

## Workstream 6: SOTA reliability gates in CI

Scope:
- Add migration matrix tests (fresh install + multiple upgrade paths).
- Add corruption drills using prepared fixture DBs.
- Add hot-query performance checks:
  - query-plan assertions for key reads/writes,
  - index presence checks for expected paths.
- Enforce docs/runbook updates with implementation changes.

Acceptance:
- CI blocks regressions in migration safety and DB integrity.
- Hot path query plans are stable and indexed.

## Workstream 7: security posture for local SQL data

Scope:
- Keep secrets out of SQLite and validate secret-storage boundary.
- Decide and document encryption policy (none/file-level/DB-level).
- Threat-model local data at rest and recovery artifacts.

Acceptance:
- Security policy is explicit and implemented for current scope.
- Diagnostics and backups do not leak sensitive secrets.

## Delivery sequencing

1. PR 1: Workstream 1 (connection posture) + tests.  
2. PR 2: Workstream 2 (migration tracking + continuity).  
3. PR 3: Workstream 3 (FK + transaction consistency).  
4. PR 4-5: Workstream 4 (table modules extraction by domain).  
5. PR 6: Workstream 5 (recovery + backup/restore + diagnostics).  
6. PR 7: Workstream 6 + 7 (CI SOTA gates + security policy closure).

## Progress updates

- 2026-02-28: Workstream 1 started.
- Implemented SQLite open-time baseline posture in `core/db.rs` for global and profile DBs:
  - `journal_mode = WAL`
  - `synchronous = NORMAL`
  - `foreign_keys = ON`
  - `busy_timeout >= 2000ms`
- Added pragma verification checks at connection open.
- Added regression test `sqlite_pragmas_are_applied_and_verified`.
- 2026-02-28: Workstream 2 started.
- Added migration tracking table (`schema_migrations`) with ordered continuity validation.
- Replaced open-time runtime schema patching with ordered profile migration steps:
  - `0001_init`
  - `0002_outline_and_settings`
  - `0003_talk_training_flag`
  - `0004_talk_numbers_backfill`
  - `0005_runs_audio_nullable`
  - `0006_seed_quests`
- Added migration tests for ordering and gap rejection.
- Added upgrade-path fixture tests:
  - legacy schema upgrade with data preservation,
  - continuation from recorded migration prefix.
- 2026-02-28: Workstream 3 started.
- Added profile migration `0007_fk_constraints` to enforce explicit foreign keys on core tables (`talk_projects`, `quest_attempts`, `runs`, `auto_feedback`, `feedback_notes`, `peer_reviews`, `active_state`, `talk_outlines`).
- Added migration-time orphan normalization for legacy rows before constraints are enforced.
- Added FK integrity verification (`PRAGMA foreign_key_check`) at migration end.
- Added regression coverage:
  - migration order now includes `0007_fk_constraints`,
  - legacy upgrade path verifies orphan normalization behavior,
  - FK enforcement test rejects invalid references after migration.
- Added explicit transaction boundaries for multi-step workspace profile writes (`create`, `switch`, `delete`) using `rusqlite` transactions.
- Added rollback tests for injected failure paths in workspace writes:
  - create rollback on insert failure,
  - switch rollback on activation failure,
  - delete rollback on fallback activation failure.
- Hardened feedback linking transactions for both run and quest flows:
  - `run_analyze`: feedback insert + run link now fails fast when run update affects zero rows,
  - `analyze_attempt`: feedback insert + attempt link now fails fast when attempt update affects zero rows.
- Added rollback tests proving no partial `auto_feedback` rows remain when link updates fail.
- Hardened peer-review import DB graph persistence (project + outline + run + peer review) behind a single transaction.
- Added pack rollback tests proving import graph rows are rolled back when peer-review insert fails.
- Added compensation cleanup for peer-review import cross-resource failures:
  - on DB aggregate persist failure, created artifact rows/files are deleted,
  - cleanup behavior is test-covered for artifact row/file removal.
- Remaining Workstream 3 scope: generalize cross-resource compensation/finalization patterns beyond peer-review import.

## Dependencies

- [docs/architecture/ipc-contracts.md](../architecture/ipc-contracts.md)
- [docs/operations/release.md](../operations/release.md)
- [docs/CONTRIBUTION_RULES.md](../CONTRIBUTION_RULES.md)

## Exit criteria

This plan is complete when:
- deterministic migrations and continuity checks are active,
- FK and transaction guarantees are enforced on critical flows,
- corruption recovery and backup/restore are operational,
- CI validates migration, integrity, and performance guardrails,
- documentation reflects final architecture and operational workflow.
