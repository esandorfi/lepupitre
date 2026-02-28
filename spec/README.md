# Spec Workspace

`spec/` is the design workspace for architecture/product/UI proposals.

## Structure
- `spec/active/`: current proposals and active design-flow material.
- `spec/archive/`: superseded or historical specs kept for traceability.

## Naming and placement
- Keep proposal filenames explicit and topic-oriented (for example `SPEC-UI-...`, `SPEC-ASR-...`).
- Put editorial help/onboarding drafts under `spec/active/help-content/`.
- Move obsolete specs to `spec/archive/` instead of deleting context.

## Status and lifecycle
- The lifecycle state of each spec file is tracked in `docs/STATUS.md`.
- Promotion, superseding, and archive rules are defined in `docs/DOCS_GOVERNANCE.md`.

## Precedence reminder
- If there is a conflict between specs and canonical docs, follow `README*`, `docs/`, and `docs/CONTRIBUTION_RULES.md`.
