# Contributing to Le Pupitre

Thanks for contributing.

## Before you start
- Read `README.md` and `docs/README.md`.
- Read `docs/architecture/overview.md` and `docs/operations/release.md`.
- Check `docs/IMPLEMENTATION_PLAN.md` for current priorities.
- Follow `docs/CONTRIBUTION_RULES.md` for decision/changelog/test requirements.

## Development setup
1. Install Tauri prerequisites for your OS:
   - https://v2.tauri.app/start/prerequisites/
2. Install dependencies:
   - `pnpm -C desktop install`
3. Run locally:
   - Full app: `pnpm -C desktop dev`
   - UI only: `pnpm -C desktop ui:dev`

## Workflow
1. Pick a small vertical slice.
2. Keep changes minimal and reversible.
3. Update docs when behavior, contracts, or decisions change.
4. Run quality gates before opening a PR.

## Quality gates
- Frontend:
  - `pnpm -C desktop ui:lint`
  - `pnpm -C desktop ui:lint:design`
  - `pnpm -C desktop ui:typecheck`
  - `pnpm -C desktop ui:test`
- Backend:
  - `cargo fmt --all -- --check`
  - `cargo clippy --all-targets --all-features -- -D warnings`
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`

## Commit and PR style
- Use conventional commit subjects (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Describe:
  - what changed,
  - why it changed,
  - which tests/checks were run.

## Documentation policy
- OSS-facing source of truth: `README*` and `docs/`.
- `spec/active/` is design-flow material and may evolve.
- `spec/archive/` is historical context only.
- If a contract changes (IPC payload, schema, migration), update all affected layers and docs.
