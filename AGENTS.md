# Agent guide (Le Pupitre)

## Sources of truth
- Follow `README.md`, `docs/README.md`, and `docs/IMPLEMENTATION_PLAN.md` first.
- Use `spec/active/` only when docs are unclear or missing.
- Apply `docs/CONTRIBUTION_RULES.md` for decision/changelog/test obligations.

## Quality and pragmatism
- Ship vertical slices: each pass must run end-to-end (UI + backend).
- Keep changes minimal and reversible; avoid speculative abstractions.
- Prefer explicit, typed contracts and runtime validation at IPC boundaries.
- IPC payloads must be schema-aligned end-to-end (Rust serde casing ↔ Zod schemas ↔ UI usage). If a field name changes, update all three and add a quick validation check.
- No network by default; least-privilege IPC and strict CSP.
- Migrations and schemas are versioned; secrets never in SQLite.
- Treat each MR as a stop point: reflect, run quality checks, and review logic before proceeding.
- Response format: start with a conventional commit title line, then details.

## Tooling & workflow
- Use `pnpm` for JS tooling and scripts.
- CI runs on GitHub Actions.

## Documentation discipline
- Update decision records in `spec/active/DECISIONS.md` when required by `docs/CONTRIBUTION_RULES.md`.
- Write README/docs and decision records in English.
- When explicitly asked to update top-level docs, update `README.md` and `docs/README.md` together.
- When touching markdown docs, run `pnpm -C desktop docs:lint` before finishing.
- Maintain `CHANGELOG.md` in English for every version bump/release.
- Use `pnpm -C desktop changelog` to generate a brief entry from Git history when releasing.
- Record unresolved decisions and mismatches; challenge assumptions early.
- If tests/lints cannot run, state why and what is missing.
