# PLAN-UI-PREFERENCES-STORAGE

Status: in_progress  
Owner: maintainers  
Last updated: 2026-02-28

## Objective

Converge UI preference persistence to a single typed storage boundary that can evolve from browser storage to a Tauri-native backend without feature-level rewrites.

## Current baseline

- Phase 1 implemented:
  - direct `localStorage` access removed from UI feature modules,
  - shared `preferencesStorage` gateway added under `desktop/ui/src/lib/`,
  - legacy key migration hooks added for versioned preference keys.
- Phase 2 in progress:
  - Tauri IPC-backed preference commands added for global and profile scope.
  - gateway writes/reads now hydrate through IPC with browser-storage fallback.

## Target architecture

- UI modules call one storage gateway (`readPreference`, `writePreference`, `removePreference`).
- Gateway defines fallback behavior for unavailable storage (non-blocking, safe defaults).
- Legacy key migration is explicit per preference domain.
- Future backend swap (Tauri DB/settings commands) happens inside the gateway only.

## Workstreams

1. Boundary enforcement
- Keep direct storage access out of feature modules.
- Add lint or static checks if direct access regresses.

1. Legacy migration closure
- Inventory old keys and map them to canonical keys.
- Remove legacy aliases after one stable release cycle.

1. Tauri-native backend migration
- Introduce backend commands for preference get/set (global/profile-scoped as needed).
- Switch gateway backend from browser storage to Tauri persistence.
- Keep compatibility fallback for browser-mode UI development.

1. Documentation and operations
- Document key ownership and scope (global vs profile).
- Document fallback/degraded behavior in architecture docs.
- Record migration behavior in changelog and release notes.

## Acceptance criteria

- No direct `localStorage` usage outside the gateway and tests.
- Backward-compatible reads for legacy keys during migration window.
- Fallback behavior is deterministic and non-blocking.
- Gateway can switch to Tauri-native backend with no feature API changes.
