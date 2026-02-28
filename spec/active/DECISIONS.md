# Active Decisions Log

Use this file for new architecture, security, IPC, and release decisions.

## Entry template
### DEC-YYYYMMDD-<slug>
- Status: proposed | accepted | superseded
- Context:
- Decision:
- Consequences:
- Related specs/docs:

## Rules
- Add one entry per significant decision change.
- If a decision is superseded, keep the old entry and mark its status.
- Archived ADRs in `docs/archive/adr/` are historical only.

### DEC-20260228-rusqlite-repository-queries
- Status: accepted
- Context:
  - The desktop backend currently uses `rusqlite` end-to-end (no `sqlx` in the codebase).
  - We need to reduce SQL spread across application logic without compromising SQLite performance and control.
- Decision:
  - Keep `rusqlite` as the DB driver.
  - Do not migrate to `sqlx` in the current hardening phase.
  - Reduce SQL spread by enforcing a strict data-access structure per domain:
    - `core/<domain>/repo.rs`: DB access functions returning typed results.
    - `core/<domain>/queries.rs`: SQL statements and query builders.
    - `core/<domain>/types.rs` (or existing typed structs) for DB row/result types.
  - Keep raw SQL for reporting queries, complex joins, and performance hotspots, but centralize it in `queries.rs`.
  - Keep command layer as orchestration-only (no direct SQL/DB mutation logic).
- Consequences:
  - We keep current runtime stability and avoid migration risk from `rusqlite` to another stack.
  - Compile-time SQL checking from `sqlx` is not adopted; safety relies on typed mapping, tests, and query-plan checks.
  - Workstream 4 will implement this structure incrementally by domain.
- Related specs/docs:
  - `docs/plan/PLAN-TAURI-SQL-HARDENING.md`
  - `docs/plan/PLAN-DOMAIN-CODE-ALIGNMENT.md`
  - `docs/CONTRIBUTION_RULES.md`
