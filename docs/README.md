# Documentation Map

This repository uses an OSS-first documentation model.

## Public docs (primary)
- `README.md`: project overview, onboarding, release status.
- `CONTRIBUTING.md`: contribution workflow and quality expectations.
- `CODE_OF_CONDUCT.md`: community behavior standards.
- `SECURITY.md`: responsible vulnerability reporting.

## Engineering docs (primary for maintainers)
- `README_TECH.md`: architecture, CI/release operations, technical constraints.
- `docs/IMPLEMENTATION_PLAN.md`: incremental delivery plan.
- `docs/adr/`: architecture decision records.
- `docs/plan/`: focused implementation plans.
- `docs/CODEX_RULES.md`: ADR/changelog/test obligations used in this repo.

## Design-flow docs (secondary)
- `spec/`: architecture/product/UI design-flow material used during iteration.
- Current policy: `spec/` supports design and exploration.
- Future policy: selected `spec/` content may be migrated to internal technical docs.

## Rule of precedence
1. `README.md`, `README_TECH.md`, `docs/IMPLEMENTATION_PLAN.md`
2. ADRs and `docs/CODEX_RULES.md`
3. `spec/` when the primary docs are unclear or incomplete
