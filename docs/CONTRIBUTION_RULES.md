# Contribution Rules

These are repository process gates for contributors.

## 1) Documentation updates
- Update canonical docs when behavior, architecture, or release flow changes.
- Keep docs in English (`README`, `docs/`, ADRs, changelog).

## 2) ADR requirements
- Add an ADR in `docs/adr/` for significant architecture/ops decisions.
- ADR minimum sections:
  - Context
  - Decision
  - Alternatives
  - Consequences
  - Status (`Proposed`, `Accepted`, `Superseded`)
  - Code/doc references

## 3) ADR divergence tracking
- ADRs must include a `Divergence` section:
  - `Aligned`
  - `Partially aligned`
  - `Divergent`
- If not aligned, include a remediation plan.

## 4) IPC schema alignment
- IPC payloads must stay aligned end-to-end:
  - Rust serde casing
  - UI Zod schemas
  - UI usage payloads/events
- Field changes require updates in all layers and a quick validation check/test.

## 5) Quality gates
- Backend:
  - `cargo fmt --all -- --check`
  - `cargo clippy --all-targets --all-features -- -D warnings`
  - `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
- Frontend:
  - `pnpm -C desktop ui:lint`
  - `pnpm -C desktop ui:typecheck`
  - `pnpm -C desktop ui:test`
- If a gate cannot run, document why in PR notes.

## 6) Release and changelog gate
- For every release/version bump:
  - update `CHANGELOG.md` in English
  - generate/update entries from Git history (`pnpm -C desktop changelog`)
  - ensure latest tag/version is present in changelog before release

## 7) Docs lifecycle gate
- If a PR touches `docs/` or `spec/`:
  - update `docs/STATUS.md`
  - follow `docs/DOCS_GOVERNANCE.md`
  - mark superseded docs/specs explicitly before archive moves

## 8) Commit style
- Use conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
