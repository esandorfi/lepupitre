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

### DEC-20260307-ui-runtime-input-contract
- Status: accepted
- Context:
  - UI feature runtimes frequently use wide flat `RuntimeArgs` signatures with many refs.
  - This pattern is functional but causes readability drift and weak domain intent signaling when signatures grow.
  - UI stores already use a grouped model (`state` + optional `dependencies`), which demonstrates a stable boundary style.
- Decision:
  - For new or touched UI runtime/composable orchestration modules, adopt a grouped input contract by default:
    - `identity` (route/profile/project/locale keys),
    - `model` (schema-aligned entities),
    - `draft` (editable/transient inputs),
    - `ui` (loading/error/status/toggle flags),
    - `deps` (stores/domain actions/navigation/side-effect helpers).
  - Keep flat args acceptable only for small runtimes (up to 7 primitive inputs) or when grouping adds no clarity.
  - Do not require a store API rewrite as part of this decision.
- Consequences:
  - Runtime contracts become easier to review and evolve while preserving behavior.
  - Naming collisions between schema entities and runtime argument namespaces are reduced.
  - Runtime-like action modules now follow the same contract model for training/workspace orchestration.
  - Feature pages/components have stricter boundaries (no direct store imports in feature `.vue` pages/components).
  - Migration proved incremental adoption without IPC/store API redesign.
- Related specs/docs:
  - `spec/active/ui/SPEC-UI-RUNTIME-INPUT-CONTRACT.md`
  - `docs/architecture/reports/desktop-ui.discovery.md`
  - `docs/architecture/reports/desktop-ui.future.md`

### DEC-20260308-ui-talks-orchestration-guardrails
- Status: accepted
- Context:
  - Talks runtime orchestration was split across runtime modules, runtime-like actions, and shared loader wrappers.
  - Test-obligation enforcement and route helper usage were partially consistent, creating policy drift risk.
- Decision:
  - Define talks orchestration scope for quality gates as: runtime modules + runtime-like actions + shared runtime loaders.
  - Enforce matching test updates for touched talks orchestration modules in CI guard scripts.
  - Require feature route helper usage (`talkRoutes`) wherever talks navigation paths are composed (pages/components/composables/helpers).
  - Adopt page-scoped composable directories plus `shared` for talks feature topology.
- Consequences:
  - QA guardrails now match real orchestration boundaries, including extracted shared loaders.
  - Route migration risk is reduced by centralizing path composition logic.
  - Contributors have slightly stricter update obligations when touching talks orchestration files.
  - Talks feature discoverability improves by replacing the flat composable folder with page-scoped modules.
- Related specs/docs:
  - `spec/active/ui/SPEC-UI-RUNTIME-INPUT-CONTRACT.md`
  - `docs/plan/PLAN-TALKS-VUE3-SOTA.md`
  - `docs/testing/TEST_MATRIX.md`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `scripts/check-test-obligations.sh`

### DEC-20260309-ui-governance-priority-ladder
- Status: accepted
- Context:
  - Talks UI currently mixes app-level Nuxt defaults, shared CSS classes/tokens, and feature-local style decisions without a strict priority order.
  - Repeated default prop usage and overlapping token/class naming increase review noise and maintenance drift.
  - Contributors requested stronger source-context comments, but without turning files into high-noise inline documentation.
- Decision:
  - Adopt a three-level UI governance priority for talks:
    - P1 app-level defaults first (`@nuxt/ui` defaults in Vite config),
    - P2 simplified CSS token contract second (minimal canonical vocabulary),
    - P3 feature-level style rules last (documented exceptions only).
  - Define talks-scope canonical semantic text bundles and explicit deprecation mapping for recurring dual-class combinations.
  - Maintain a talks visual exception registry for feature-only mappings (for example mascot tone and blueprint threshold policies).
  - Enforce "why-focused" source documentation contract:
    - add concise module/function context comments for non-obvious intent and invariants,
    - avoid comments for self-evident implementation details.
  - Define module-type comment thresholds and good/bad examples to keep comment style consistent in talks scope.
  - Standardize on JSDoc (`/** ... */`) for exported talks composable/runtime/helper APIs and require same-PR docstring updates when behavior contracts change.
  - For talks page roots (`features/talks/pages/*.vue`), standardize one script-level composition-root header (`Purpose/Reads/Actions/Boundary`) to document page flow without template comment noise.
  - Standardize guard layering in talks:
    - compute feature access gates once in shared composables and page roots,
    - keep child panels render-only,
    - reserve router guards for hard redirect invariants.
  - Standardize talks page consumption style:
    - pages bind one `vm` object from `use*PageState`,
    - avoid wide script-level destructuring of page-state fields.
  - Challenge "single token only" policy with a constrained compromise:
    - keep one-class semantic bundles for common cases,
    - retain limited orthogonal primitives for accessibility and exception handling.
- Consequences:
  - Styling decisions become reviewable through a deterministic order rather than ad hoc local preference.
  - Talks migration can remove redundant default props and reduce token/class overlap incrementally with low risk.
  - Comment quality expectations become explicit, reducing both under-documentation and comment noise.
  - Exported talks API hover-help remains consistent and reviewable through JSDoc maintenance in each change.
  - Page-level architecture flow remains discoverable from a single header block per talks page while keeping templates clean.
  - Talks guard behavior is easier to reason about with reduced page/component duplication and explicit router-vs-feature responsibility split.
  - Talks page scripts stay simpler and less brittle during composable API evolution.
  - Talks now uses single-class semantic text bundles for common muted/meta/link status rendering while preserving base primitives for exceptions.
  - Feature-only visual policies remain explicit and auditable through the talks exception registry.
- Related specs/docs:
  - `docs/plan/PLAN-TALKS-VUE3-SOTA.md`
  - `docs/CONTRIBUTION_RULES.md`
  - `desktop/ui/vite.config.ts`
  - `desktop/ui/src/assets/main.css`

### DEC-20260309-ui-feature-rules-rollout
- Status: accepted
- Context:
  - Talks governance introduced stable page composition rules (single `vm`, local i18n ownership, composition-root headers) with good readability and low regression risk.
  - Non-talk features still had mixed page patterns (wide destructuring and composable-proxied `t`), increasing drift and review noise.
  - Team requested broader consistency without touching IPC or store contracts.
- Decision:
  - Adopt the same page-level rules for touched non-talk features:
    - page scripts consume one `vm` from `use*PageState`,
    - i18n labels stay page/component-local (`useI18n()` directly),
    - `use*PageState` return APIs do not expose `t`,
    - touched page roots include one short composition header (`Purpose/Reads/Actions/Boundary`).
  - Enforce these rules in CI with a dedicated UI feature-rule guard:
    - forbid `:t=` prop threading in feature SFCs,
    - forbid feature component `defineProps` contracts exposing `t`,
    - require single `vm` page binding for `use*PageState/use*PageController`,
    - forbid wide page-level destructuring for these composables.
  - Keep runtime/store/IPC boundaries unchanged in this rollout.
- Consequences:
  - Cross-feature page scripts are easier to scan and safer to evolve when page-state APIs change.
  - i18n ownership is explicit and avoids helper leakage through page-state contracts.
  - Runtime-vs-state separation remains aligned with existing architecture and does not require backend or store rewrites.
  - Feature-level consistency drift is now blocked early by deterministic static checks in local/CI validation.
- Related specs/docs:
  - `docs/plan/PLAN-TALKS-VUE3-SOTA.md`
  - `docs/plan/PLAN-UI-FEATURE-RULES-ROLLOUT.md`
  - `spec/active/ui/SPEC-UI-RUNTIME-INPUT-CONTRACT.md`
