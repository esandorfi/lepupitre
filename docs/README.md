# Documentation Map

Use this map to avoid documentation drift.

## Canonical docs (source of truth)
- [README.md](../README.md): product and user onboarding.
- [docs/ARCHITECTURE.md](ARCHITECTURE.md): stable hub to architecture and operations docs.
- [docs/architecture/overview.md](architecture/overview.md): architecture baseline.
- [docs/architecture/ipc-contracts.md](architecture/ipc-contracts.md): IPC contract rules.
- [docs/architecture/asr.md](architecture/asr.md): ASR architecture and troubleshooting.
- [docs/operations/release.md](operations/release.md): release mechanics and CI flow.
- [docs/operations/signing.md](operations/signing.md): signing and notarization status.
- [docs/IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): current delivery priorities.

## Governance docs (how docs are managed)
- [docs/CONTRIBUTION_RULES.md](CONTRIBUTION_RULES.md): required repository process gates (tests, decisions, changelog).
- [docs/DOCS_GOVERNANCE.md](DOCS_GOVERNANCE.md): lifecycle, ownership, naming, and archive policy.
- [docs/STATUS.md](STATUS.md): status ledger for docs/specs and next actions.
- [CONTRIBUTING.md](../CONTRIBUTING.md): contributor setup and workflow.
- [AGENTS.md](../AGENTS.md): agent-specific behavior rules.

## Proposal docs (not implementation truth)
- [spec/README.md](../spec/README.md): how `spec/` is used.
- [spec/active/README.md](../spec/active/README.md): active proposal index and grouping.
- [spec/active/](../spec/active/README.md): active architecture/product/UI design proposals.
- [spec/active/ui/SPEC-UI-DESKTOP-SYSTEM.md](../spec/active/ui/SPEC-UI-DESKTOP-SYSTEM.md): active UI system reference during redesign.
- [spec/archive/](../spec/archive/README.md): superseded or historical specs.

## Historical docs
- [docs/archive/](archive/README.md): archived reports and superseded snapshots.

## Where to write new content
- Decision with long-term impact: [spec/active/DECISIONS.md](../spec/active/DECISIONS.md)
- Active execution plan: [docs/plan/](plan/)
- Implemented cross-cutting rule: update canonical file in [docs/](README.md)
- Early proposal or exploration: [spec/active/](../spec/active/README.md)
- Replaced/obsolete content: [docs/archive/](archive/README.md)

## Precedence
1. [docs/CONTRIBUTION_RULES.md](CONTRIBUTION_RULES.md)
2. Canonical docs ([README.md](../README.md) + [docs/](README.md))
3. Active proposals in [spec/active/](../spec/active/README.md)
4. Archived material (history only)
