# Pull Request

## Summary

- What changed:
- Why:

## Validation

- [ ] `pnpm -C desktop docs:lint`
- [ ] `pnpm -C desktop ui:lint`
- [ ] `pnpm -C desktop ui:lint:feature-rules`
- [ ] `pnpm -C desktop ui:typecheck`
- [ ] `pnpm -C desktop ui:test`
- [ ] `cargo fmt --all -- --check` (from `desktop/src-tauri`)
- [ ] `cargo clippy --all-targets --all-features -- -D warnings` (from `desktop/src-tauri`)
- [ ] `cargo test --manifest-path desktop/src-tauri/Cargo.toml`
- [ ] Not run (explain why)
- [ ] Updated required contract tests per `docs/testing/TEST_MATRIX.md` (or N/A)

## Docs and governance checklist

- [ ] I reviewed `docs/CONTRIBUTION_RULES.md` and followed required gates.
- [ ] Canonical docs were updated for behavior/architecture/release changes.
- [ ] `spec/active/DECISIONS.md` was updated for significant decisions (or N/A).
- [ ] `docs/STATUS.md` was updated when touching `docs/` or `spec/`.
- [ ] Superseded docs/specs are marked and linked to replacements.

## Talks Architecture Checklist (when touching `desktop/ui/src/features/talks/**`)

- [ ] Runtime state remains grouped by plane (`identity` / `model` / `ui`, plus `draft` only when needed).
- [ ] Runtime UI errors use `runtimeContract` helpers and carry category where available.
- [ ] Shared talks runtime loaders are reused (`talkRuntimeDataLoader`) instead of duplicated fetch orchestration.
- [ ] Talks route links use `talkRoutes` helpers wherever navigation paths are composed (pages/components/composables/helpers).
- [ ] Talks feature-local panel components own i18n labels directly (avoid label-prop forwarding unless true cross-feature reuse).
- [ ] Talks composables follow page-scoped directories plus `shared` (avoid re-introducing flat composable sprawl).
- [ ] Touched talks orchestration modules (runtime/action/loader) have matching test file updates.
