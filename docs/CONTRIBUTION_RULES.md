# Contribution Rules

These are repository process gates for contributors.

## Rule #1: Simplicity and maintainability first
- Priority is to keep the code simple and maintainable.
- If a test is not simple enough to read and maintain, treat it as a code design smell first.
- In that case, refactor production code boundaries (services, adapters, orchestration) before adding more complex tests.
- Use-case tests should prefer domain/service APIs and test harness helpers over ad hoc SQL setup.

## 1) Documentation updates
- Update canonical docs when behavior, architecture, or release flow changes.
- Keep docs in English (`README`, `docs/`, changelog, active specs).

## 2) Decision records (no new ADRs)
- Do not create new ADR files.
- Record new significant decisions in [spec/active/DECISIONS.md](../spec/active/DECISIONS.md).
- Use clear status per entry (`proposed`, `accepted`, `superseded`).

## 3) IPC schema alignment
- IPC payloads must stay aligned end-to-end:
  - Rust serde casing
  - UI Zod schemas
  - UI usage payloads/events
- Field changes require updates in all layers and a quick validation check/test.

## 4) Quality gates
- Documentation:
  - `pnpm -C desktop docs:lint`
  - markdown link check (`lychee --offline`) on canonical docs
- Domain structure:
  - `scripts/check-domain-structure.sh`
  - Guards dependency direction (`core` not depending on `commands`, UI domain APIs not depending on view/store layers)
  - Enforces file-size budgets for known orchestration/wrapper hotspots
- Backend:
  - `cargo fmt --all -- --check`
  - `cargo clippy --all-targets --all-features -- -D warnings`
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
- Frontend:
  - `pnpm -C desktop ui:lint`
  - `pnpm -C desktop ui:typecheck`
  - `pnpm -C desktop ui:test`
- If a gate cannot run, document why in PR notes.

## 5) Test matrix and obligations
- Treat [docs/testing/TEST_MATRIX.md](testing/TEST_MATRIX.md) as the source of truth for core use-case test obligations.
- If a PR changes core domain behavior, update matching domain contract tests in the same PR.
- CI enforces selected backend obligations; enforcement details live in repository scripts/workflows.

## 6) Release and changelog gate
- For every release/version bump:
  - update [CHANGELOG.md](../CHANGELOG.md) in English
  - generate/update entries from Git history (`pnpm -C desktop changelog`)
  - ensure latest tag/version is present in changelog before release

## 7) Docs lifecycle gate
- If a PR touches `docs/` or `spec/`:
  - complete the docs checklist in [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)
  - update [docs/STATUS.md](STATUS.md)
  - follow [docs/DOCS_GOVERNANCE.md](DOCS_GOVERNANCE.md)
  - mark superseded docs/specs explicitly before archive moves

## 8) Commit style
- Use conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## 9) SQL placement rule
- Do not add direct SQL in migrated command wrappers.
- New SQL should be centralized under domain DB modules (`core/<domain>/repo.rs` + `core/<domain>/queries.rs`).
- Keep raw SQL for reporting/complex/performance-critical queries, but keep it out of orchestration code.

## 10) Migration flow rule
- Schema changes must be delivered via ordered migrations (global/profile) and recorded in `schema_migrations`.
- Migrations are append-only:
  - add a new versioned step,
  - do not rewrite already released migration versions.
- Migration PRs must include:
  - fresh DB path validation,
  - upgrade-path validation from older fixtures,
  - continuity checks (no skipped versions).
- If migration normalizes legacy/orphan data, document the normalization behavior in plan/release notes.
