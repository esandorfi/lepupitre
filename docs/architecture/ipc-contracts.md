# IPC Contracts

## Contract rule
IPC payloads must remain aligned end-to-end:
- Rust serde field names/casing
- UI Zod schemas
- UI command/event payload usage

If one layer changes, all layers must be updated in the same PR.

## Versioning
- JSON schemas are versioned (`schemas/*.v1.json`).
- SQL migrations are versioned (`migrations/*`).
- Breaking contract changes require:
  - a decision record in `spec/active/DECISIONS.md`
  - a changelog update for the affected release

## Validation expectation
- Add or update a focused validation check/test when contract fields change.
- Keep naming deterministic between Rust and TypeScript.
- Avoid implicit payload fallbacks that hide mismatches.

## UI redesign guardrails
When UI visual structure changes, keep these logic contracts tested:
- navigation routing contract
- breadcrumb/link context retention
- nav mode persistence and fallback rules
- quest progression guardrails
- ASR settings mapping and validation
- ASR error-state mapping
- feedback context retention
- IPC schema alignment checks
