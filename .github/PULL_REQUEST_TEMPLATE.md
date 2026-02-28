# Pull Request

## Summary

- What changed:
- Why:

## Validation

- [ ] `pnpm -C desktop docs:lint`
- [ ] `pnpm -C desktop ui:lint`
- [ ] `pnpm -C desktop ui:typecheck`
- [ ] `pnpm -C desktop ui:test`
- [ ] `cargo fmt --all -- --check` (from `desktop/src-tauri`)
- [ ] `cargo clippy --all-targets --all-features -- -D warnings` (from `desktop/src-tauri`)
- [ ] `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
- [ ] Not run (explain why)

## Docs and governance checklist

- [ ] I reviewed `docs/CONTRIBUTION_RULES.md` and followed required gates.
- [ ] Canonical docs were updated for behavior/architecture/release changes.
- [ ] `spec/active/DECISIONS.md` was updated for significant decisions (or N/A).
- [ ] `docs/STATUS.md` was updated when touching `docs/` or `spec/`.
- [ ] Superseded docs/specs are marked and linked to replacements.
