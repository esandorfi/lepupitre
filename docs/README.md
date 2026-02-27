# Documentation Map

Use this map to avoid documentation drift.

## Canonical docs (source of truth)
- `README.md`: OSS overview and onboarding.
- `docs/ARCHITECTURE.md`: architecture and release operations.
- `docs/IMPLEMENTATION_PLAN.md`: current delivery priorities.
- `docs/DESIGN_SYSTEM.md`: implemented UI rules.
- `docs/adr/`: accepted or proposed architecture decisions.

## Governance docs (how docs are managed)
- `docs/CONTRIBUTION_RULES.md`: required repository process gates (tests, ADR, changelog).
- `docs/CODEX_RULES.md`: agent-specific behavior rules.
- `docs/DOCS_GOVERNANCE.md`: lifecycle, ownership, naming, and archive policy.
- `docs/STATUS.md`: status ledger for docs/specs and next actions.

## Proposal docs (not implementation truth)
- `spec/README.md`: how `spec/` is used.
- `spec/`: architecture/product/UI design proposals and drafts.

## Historical docs
- `docs/archive/`: archived reports and superseded snapshots.

## Where to write new content
- Decision with long-term impact: `docs/adr/ADR-*.md`
- Active execution plan: `docs/plan/PLAN-*.md`
- Implemented cross-cutting rule: update canonical file in `docs/`
- Early proposal or exploration: `spec/`
- Replaced/obsolete content: `docs/archive/`

## Precedence
1. Accepted ADRs + `docs/CONTRIBUTION_RULES.md`
2. Canonical docs (`README*` + `docs/`)
3. Active proposals in `spec/`
4. Archived material (history only)
