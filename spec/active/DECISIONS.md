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

### DEC-20260228-local-sql-security-boundary
- Status: accepted
- Context:
  - Local SQLite now includes recovery snapshots and diagnostics workflows.
  - We need explicit boundaries to avoid accidental secret storage and accidental sensitive data exposure during operations.
- Decision:
  - SQLite is not a secret store in current scope.
  - Preference keys containing sensitive fragments (`token`, `secret`, `password`, `credential`, `api_key`, `private_key`) are rejected at IPC validation boundaries (UI Zod + Rust).
  - Diagnostics IPC payload remains metadata-only (schema/migration/integrity counters) and excludes file paths/content dumps.
  - Encryption at rest remains host-OS responsibility for now (no app-layer DB encryption in this phase).
- Consequences:
  - Security posture is enforceable by code/tests instead of documentation-only guidance.
  - Integrations requiring secrets must use keyring/stronghold and not SQLite preferences.
  - Future app-layer encryption adoption requires an explicit new decision and migration plan.
- Related specs/docs:
  - `docs/architecture/overview.md`
  - `docs/architecture/ipc-contracts.md`
  - `docs/operations/release.md`
  - `docs/CONTRIBUTION_RULES.md`
  - `docs/plan/PLAN-TAURI-SQL-HARDENING.md`

### DEC-20260228-release-trust-gates
- Status: accepted
- Context:
  - Release packaging previously produced artifacts without enforceable trust gates.
  - We need deterministic CI behavior where signing/notarization requirements are explicit and fail-closed when enabled.
- Decision:
  - Introduce repository-level trust toggles:
    - `LEPUPITRE_REQUIRE_WINDOWS_SIGNING`
    - `LEPUPITRE_REQUIRE_MACOS_NOTARIZATION`
  - Add release preflight validation (`scripts/check-release-signing.sh`) that fails if required secrets are missing for enabled toggles.
  - Add release verification steps:
    - Windows: Authenticode validity checks on MSI/NSIS installers.
    - macOS: `codesign`, `spctl`, and `stapler` validation.
- Consequences:
  - Default behavior remains compatible for unsigned community builds (toggles disabled).
  - Once toggles are enabled, CI blocks unsigned/untrusted release artifacts.
  - Release operators must provision and rotate signing secrets through repository settings.
- Related specs/docs:
  - `docs/operations/signing.md`
  - `docs/operations/release.md`
  - `docs/IMPLEMENTATION_PLAN.md`
