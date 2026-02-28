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

## Preferences IPC
- Preference commands are first-class IPC contracts and must keep schema alignment:
  - `preference_global_get` / `preference_global_set`
  - `preference_profile_get` / `preference_profile_set`
- Payload rules:
  - `profileId` stays camelCase in UI payload schemas.
  - `key` must match the canonical key format (`[A-Za-z0-9._:-]+`).
  - `key` must not include sensitive fragments (`token`, `secret`, `password`, `credential`, `api_key`, `private_key`).
  - `value` is nullable; `null` means delete.
- Fallback rule:
  - UI may fall back to local browser storage when Tauri runtime/IPC is unavailable, but command payload shapes still remain the source contract.

## DB diagnostics IPC
- Command: `profile_db_diagnostics`
- Payload:
  - `profileId?: string` (optional; when omitted, only global diagnostics are returned)
- Response contract:
  - `global`: DB diagnostics object
  - `profile`: nullable DB diagnostics object
  - diagnostics fields include:
    - `schemaVersion`
    - `latestMigration`
    - `appliedMigrationCount`
    - `expectedMigrationCount`
    - `continuityOk`
    - `continuityError`
    - `integrityCheck`
    - `foreignKeyViolations`
- Security boundary:
  - diagnostics payload is metadata-only and must not include backup paths, corrupted file paths, or content extracts.

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
