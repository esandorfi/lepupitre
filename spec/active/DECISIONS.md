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
    - `LEPUPITRE_WINDOWS_SIGNING_PROVIDER` (`signpath` or `self-managed`)
    - `LEPUPITRE_REQUIRE_MACOS_NOTARIZATION`
  - Add release preflight validation (`scripts/check-release-signing.sh`) that fails if required secrets are missing for enabled toggles/provider.
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

### DEC-20260228-license-switch-apache2
- Status: accepted
- Context:
  - SignPath Foundation terms require OSI-approved open-source licensing for participating projects.
  - The repository previously used a Fair Source license and was not eligible for that requirement.
- Decision:
  - Switch repository license to Apache License 2.0.
  - Publish explicit public trust artifacts:
    - `README.md` section `Code signing policy`,
    - `docs/operations/CODE_SIGNING_POLICY.md`,
    - `docs/PROJECT_GOVERNANCE.md`,
    - `PRIVACY.md`.
- Consequences:
  - Project licensing is now OSI-approved and aligned with SignPath Foundation eligibility requirements.
  - SignPath application can proceed with explicit maintainer roles and policy links.
- Related specs/docs:
  - `LICENSE`
  - `NOTICE`
  - `README.md`
  - `docs/operations/SIGNPATH_FOUNDATION_APPLICATION.md`

### DEC-20260228-contextual-help-markdown-runtime
- Status: accepted
- Context:
  - Help and onboarding content was hardcoded in UI i18n strings, making route-context guidance difficult to evolve independently from layout.
  - `SPEC-UI-HELP-CONTEXTUAL-ASSISTANCE` defines stable `topic_id` mapping and markdown-driven content updates.
  - The project needs a website deployment slice (`spec/active/site/github-pages.md`) without coupling to desktop release logic.
- Decision:
  - Adopt a local markdown runtime help content layer under `desktop/ui/src/content/help/*.md`.
  - Enforce a frontmatter contract (`id`, `title`, `audiences`, `version`, optional `applies_to_routes`) validated by a typed loader in UI.
  - Implement canonical route-to-topic mapping and Help deep-link query contract: `/help?topic=<topic_id>&audience=<audience>`.
  - Use English-first markdown content for both EN/FR until dedicated FR markdown files are added.
  - Introduce `website/` Astro project with GitHub Pages deployment via `.github/workflows/pages.yml` and CI website build checks.
- Consequences:
  - Content updates no longer require core Help/Onboarding logic rewrites.
  - Route help links remain stable through UI layout changes as long as `topic_id` values are preserved.
  - French locale keeps functional UI labels, but contextual help markdown remains English in this phase.
  - Website deployment is independent from desktop release packaging, while downloads list remains linked to GitHub release assets.
- Related specs/docs:
  - `spec/active/ui/SPEC-UI-HELP-CONTEXTUAL-ASSISTANCE.md`
  - `spec/active/help-content/`
  - `spec/active/site/github-pages.md`
  - `docs/operations/release.md`
