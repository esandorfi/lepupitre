# Agent guide (Le Pupitre)

## Sources of truth
- Follow `README.md`, `README_TECH.md`, and `docs/IMPLEMENTATION_PLAN.md` first.
- Use `spec/` only when docs are unclear or missing.
- Apply `docs/CODEX_RULES.md` for ADR/changelog/test obligations.

## Quality and pragmatism
- Ship vertical slices: each pass must run end-to-end (UI + backend).
- Keep changes minimal and reversible; avoid speculative abstractions.
- Prefer explicit, typed contracts and runtime validation at IPC boundaries.
- No network by default; least-privilege IPC and strict CSP.
- Migrations and schemas are versioned; secrets never in SQLite.
- Treat each MR as a stop point: reflect, run quality checks, and review logic before proceeding.
- Response format: start with a conventional commit title line, then details.

## Tooling & workflow
- Use `pnpm` for JS tooling and scripts.
- CI runs on GitHub Actions.

## Documentation discipline
- Update docs/ADR/changelog when required by `docs/CODEX_RULES.md`.
- Record unresolved decisions and mismatches; challenge assumptions early.
- If tests/lints cannot run, state why and what is missing.
