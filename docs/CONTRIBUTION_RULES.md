# Contribution Rules

These are repository process gates for contributors.

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
- If a PR changes a mapped source area, update the mapped tests in the same PR.
- CI enforces selected backend obligations (workspace and quest domains first).

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
