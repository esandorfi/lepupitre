# PLAN-SQL-TEST-AUDIT

Status: in_progress
Owner: maintainers
Last updated: 2026-03-01

## Objective

Run a pragmatic SQL + test audit in parallel, with a full pass after topology freeze, while keeping delivery momentum.

## Why now

- Topology migration is near stabilization (`commands/` + `domain/` + `platform/` + `kernel/`).
- SQL placement and test readability rules exist, but need explicit audit criteria and execution gates.
- We want tests as specification, not implementation-coupled scripts.

## Audit scope

1. SQL placement and shape
- SQL only in migrations and repository/query modules (domain/platform data-access layer).
- No direct SQL in command wrappers or UI.
- Hot-path queries tracked for index/query-plan coverage.

1. Test architecture
- Unit tests focus on domain logic and pure functions.
- Integration tests verify command/domain contracts end-to-end.
- Test setup stays readable and business-oriented.

1. Reliability checks
- Migration continuity and upgrade-path checks.
- Query-plan/index checks for hot reads/writes.
- Corruption/recovery and transactional rollback checks already enforced by reliability gates.

## Guard rails (target policy)

1. Allowed SQL in tests
- Allowed:
  - repository/query-layer tests,
  - migration tests,
  - prepared fixture builders for upgrade-path/corruption drills.
- Not allowed:
  - ad hoc SQL setup in command integration tests when domain/repo helpers can express the same setup,
  - SQL assertions in UI tests.

1. Unit vs integration boundary
- Unit tests:
  - domain/service/lib behavior only,
  - no dependency on command wrappers,
  - no test logic coupled to table schema details unless testing repo/query modules directly.
- Integration tests:
  - command/domain contracts and critical use-case flows,
  - deterministic fixtures/harness,
  - assert business outcomes and domain errors.

1. Query-plan and index checks
- Any new/changed hot query must include:
  - expected index coverage,
  - `EXPLAIN QUERY PLAN` validation path in reliability checks.
- Query-plan checks stay in backend reliability scripts/tests, not UI.

## Execution sequence

### Phase 1 (now): checklist and baseline

1. Publish this plan and align contribution rules.
1. Define audit checklist by layer:
- SQL placement,
- test boundary compliance,
- query-plan/index obligations.
1. Keep slice-level checks active during ongoing refactors.

Exit criteria:
- Plan documented and referenced in status ledger.
- Contribution rules include explicit SQL/test audit policy.

### Phase 2 (during remaining refactor): lightweight enforcement per slice

1. For each slice PR:
- verify no SQL moved into command wrappers,
- verify tests remain domain-first and readable,
- add or adjust query-plan/index checks only where SQL changed.
1. Keep CI gates green (`check-domain-structure`, `check-db-reliability`, UI/backend tests).

Exit criteria:
- No new boundary violations in touched slices.
- No SQL drift back into orchestration layers.

### Phase 3 (after topology freeze): full audit pass (parallel tracks)

Track A: SQL audit
1. Inventory all SQL locations.
1. Classify by allowed locations (migration, repo/query, fixture-builder).
1. Flag and remediate violations.

Track B: Test audit
1. Inventory core use-case coverage against `docs/testing/TEST_MATRIX.md`.
1. Flag tests coupled to implementation details over domain behavior.
1. Refactor toward domain/spec readability where needed.

Track C: Reliability confirmation
1. Run full backend reliability and test suite.
1. Confirm query-plan/index checks for changed hot queries.
1. Record residual risk and follow-ups.

Exit criteria:
- SQL locations fully compliant with architecture rules.
- Core use-case tests are readable as specification.
- Reliability checks pass on full audit run.

## Validation commands

- `scripts/check-domain-structure.sh`
- `scripts/check-db-reliability.sh`
- `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
- `pnpm -C desktop ui:test`
- `pnpm -C desktop ui:typecheck`

## Deliverables

1. Audit findings summary (violations, remediations, residual risks).
1. Updated contribution rules and status ledger entries.
1. Follow-up tasks for non-blocking improvements (if any).

## Future implementation queue

After topology freeze, prioritize these hardening steps:

1. Reliability gate selector fix
- Update DB reliability test filters from legacy `core::db::tests::*` to `platform::db::tests::*` in `scripts/check-db-reliability.sh` so checks execute real tests (not zero-test passes).

1. Strict SQL boundary enforcement
- Add a CI/script guard that forbids SQL string literals outside approved locations:
  - migrations,
  - `domain/*/queries.rs`,
  - explicitly approved `platform/*` SQL adapters.

1. Domain query-pattern completion
- Finish migration of remaining SQL-heavy domain modules to canonical shape:
  - `mod.rs` (orchestration),
  - `repo.rs` (typed data-access),
  - `queries.rs` (SQL text/builders),
  - `types.rs` (row/domain mapping types).
- First candidates: talk outline and exchange modules where inline SQL remains.
