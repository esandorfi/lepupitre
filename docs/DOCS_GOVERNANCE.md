# Documentation Governance

## Goal
- Keep documentation simple, current, and unambiguous.
- Enforce one source of truth per topic.

## Folder contract
- `README.md`, `docs/ARCHITECTURE.md`, and `docs/`: canonical project docs.
- `docs/adr/`: architecture/operations decisions.
- `docs/plan/`: focused execution plans for active work.
- `spec/`: proposals and exploration, not implementation truth.
- `docs/archive/`: historical material only.

## Naming rules
- Root `docs/` files must be stable and explicit (example: `IMPLEMENTATION_PLAN.md`).
- ADRs must use `ADR-<DOMAIN>-<ID>-<slug>.md` (or existing accepted ADR naming).
- Execution plans must use `PLAN-<TOPIC>.md` under `docs/plan/`.
- New root files should be rare and cross-cutting; otherwise use `docs/plan/` or `spec/`.

## Precedence
1. Accepted ADRs + `docs/CONTRIBUTION_RULES.md`
2. Canonical docs in `README*` + `docs/`
3. Active proposals in `spec/`
4. `docs/archive/` for context only

## Lifecycle states
- `draft`
- `proposed`
- `accepted`
- `implemented`
- `superseded`
- `archived`

## Required workflow
1. Draft in `spec/` or `docs/plan/`.
2. Approve decisions via ADR when needed.
3. Promote implemented rules to canonical docs.
4. Update `docs/STATUS.md` in the same PR.
5. Move obsolete files to `docs/archive/` and keep a pointer to replacement.

## Drift prevention checklist (PR)
- Canonical docs updated for behavior/architecture changes.
- `docs/STATUS.md` updated for touched docs/specs.
- Superseded documents marked and linked to replacement.
- No duplicate active source for the same topic.
