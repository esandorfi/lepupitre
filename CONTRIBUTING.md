# Contributing to Le Pupitre

Thanks for contributing.

## Before you start
- Read [README.md](README.md) and [docs/README.md](docs/README.md).
- Read [docs/architecture/overview.md](docs/architecture/overview.md) and [docs/operations/release.md](docs/operations/release.md).
- Read [docs/PROJECT_GOVERNANCE.md](docs/PROJECT_GOVERNANCE.md) for maintainer/signing roles.
- Check [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for current priorities.
- Follow [docs/CONTRIBUTION_RULES.md](docs/CONTRIBUTION_RULES.md) for decision/changelog/test requirements.

## Development setup
1. Install Tauri prerequisites for your OS:
   - [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)
2. Install `pnpm` once globally (not per repository/worktree):
   - Recommended: `corepack enable` then `corepack prepare pnpm@10.4.0 --activate`
   - Verify: `pnpm --version`
3. Install dependencies for this checkout:
   - `pnpm -C desktop install`
4. Run locally:
   - Full app: `pnpm -C desktop dev`
   - UI only: `pnpm -C desktop ui:dev`

## Worktree behavior (important)
- `pnpm` is a machine-level tool. You do not reinstall `pnpm` per worktree.
- Each Git worktree has its own local dependencies (`node_modules`).
- When you create/switch to a new worktree, run `pnpm -C desktop install` once in that worktree before `dev`/`test` commands.
- For ASR sidecar/model dev assets, use a shared sibling folder:
  - `just asr-dev-create`
  - `just asr-build-dev-home`
  - `just asr-model-dev tiny` (or `base`) to download+verify model in dev home
  - keep models in `../lepupitre-asr-dev/models`
  - run with `just dev-desktop-asr-dev <model-path>`
  - on Windows, run sidecar builds from "Developer PowerShell for VS 2022" and set:
    - `$env:LIBCLANG_PATH = 'C:\Program Files\LLVM\bin'`

## Workflow
1. Pick a small vertical slice.
2. Keep changes minimal and reversible.
3. Update docs when behavior, contracts, or decisions change.
4. Run quality gates before opening a PR.

## Quality gates
- Documentation:
  - `pnpm -C desktop docs:lint`
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
- Public-facing source of truth: [README.md](README.md) and [docs/](docs/README.md).
- [spec/active/](spec/active/README.md) is design-flow material and may evolve.
- [spec/archive/](spec/archive/README.md) is historical context only.
- If a contract changes (IPC payload, schema, migration), update all affected layers and docs.
