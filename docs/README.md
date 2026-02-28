# Documentation Map

Use this map to avoid documentation drift.

## Canonical docs (source of truth)
- `README.md`: product and user onboarding.
- `docs/ARCHITECTURE.md`: stable hub to architecture and operations docs.
- `docs/architecture/overview.md`: architecture baseline.
- `docs/architecture/ipc-contracts.md`: IPC contract rules.
- `docs/architecture/asr.md`: ASR architecture and troubleshooting.
- `docs/operations/release.md`: release mechanics and CI flow.
- `docs/operations/signing.md`: signing and notarization status.
- `docs/IMPLEMENTATION_PLAN.md`: current delivery priorities.

## Governance docs (how docs are managed)
- `docs/CONTRIBUTION_RULES.md`: required repository process gates (tests, decisions, changelog).
- `docs/DOCS_GOVERNANCE.md`: lifecycle, ownership, naming, and archive policy.
- `docs/STATUS.md`: status ledger for docs/specs and next actions.
- `CONTRIBUTING.md`: contributor setup and workflow.
- `AGENTS.md`: agent-specific behavior rules.

## Proposal docs (not implementation truth)
- `spec/README.md`: how `spec/` is used.
- `spec/active/README.md`: active proposal index and grouping.
- `spec/active/`: active architecture/product/UI design proposals.
- `spec/active/ui/SPEC-UI-DESKTOP-SYSTEM.md`: active UI system reference during redesign.
- `spec/archive/`: superseded or historical specs.

## Historical docs
- `docs/archive/`: archived reports and superseded snapshots.

## Where to write new content
- Decision with long-term impact: `spec/active/DECISIONS.md`
- Active execution plan: `docs/plan/PLAN-*.md`
- Implemented cross-cutting rule: update canonical file in `docs/`
- Early proposal or exploration: `spec/active/`
- Replaced/obsolete content: `docs/archive/`

## Precedence
1. `docs/CONTRIBUTION_RULES.md`
2. Canonical docs (`README.md` + `docs/`)
3. Active proposals in `spec/active/`
4. Archived material (history only)
