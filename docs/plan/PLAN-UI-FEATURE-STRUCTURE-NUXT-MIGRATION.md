# Plan: UI Feature Structure and Nuxt UI Migration

Status: in_progress  
Owner: UI / Maintainers  
Last updated: 2026-03-03

## Objective
Restructure the desktop UI into feature-oriented directories and then migrate to a Nuxt UI single-component system with minimal wrappers.

## Scope
- `desktop/ui/src` frontend structure and routing
- UI component system alignment to Nuxt UI
- No backend IPC/schema changes

## Invariants
- Keep route names unchanged
- Keep route paths unchanged
- Keep redirect behavior unchanged
- Keep user-facing behavior stable during Step A

## Step A: Directory and Routing Structure

### Target structure
- `src/features/home/pages/HomePage.vue` (Home as standalone feature)
- `src/features/training/pages/*`
- `src/features/talks/pages/*`
- `src/features/feedback/pages/*`
- `src/features/packs/pages/*`
- `src/features/workspace/pages/*`
- `src/features/support/pages/*`
- router split modules:
  - `home.routes.ts`
  - `training.routes.ts`
  - `talks.routes.ts`
  - `feedback.routes.ts`
  - `packs.routes.ts`
  - `workspace.routes.ts`
  - `support.routes.ts`

### Checklist
- [x] Move flat `src/pages/*` to `src/features/*/pages/*`
- [x] Split router into feature route modules
- [x] Keep composed `routes.ts` as single export surface
- [x] Preserve route names/paths
- [ ] Extract Home page internals into `features/home/components` and `features/home/composables`
- [ ] Validate all UI smoke paths after restructure

## Step B: Nuxt UI Single-System Migration

### Policy
- Nuxt UI is the base component system
- Minimal wrappers only:
  - `AppButton` (`UButton`)
  - `AppPanel` (`UCard`)
  - `AppDialog` (`UModal`)
  - `AppBadge` (`UBadge`)
- Direct Nuxt primitives for fields and menus:
  - `UInput`, `UTextarea`, `USelect`, `USwitch`, `UDropdownMenu`, `UPopover`, etc.

### Migration waves
1. Shared primitives and shell menus/dialogs
2. Support + workspace pages
3. Home feature full migration
4. Talks + feedback pages
5. Recorder/domain composite internals

### Checklist
- [ ] Add minimal wrapper set under `src/components/ui/`
- [ ] Refactor shared primitive components to use wrappers/Nuxt
- [ ] Migrate support + workspace pages
- [ ] Migrate Home feature as a full vertical slice
- [ ] Migrate talks + feedback features
- [ ] Migrate recorder composites
- [ ] Add guard rails against raw primitive drift in pages

## Risks and Mitigations
- Large move conflict risk in Step A:
  - Mitigate with single dedicated structural pass before UI migration.
- Import/path breakage:
  - Mitigate with typecheck + route tests + UI tests.
- Visual drift during Step B:
  - Mitigate with feature-by-feature rollout and parity checks.

## Validation Gates (per wave)
- `pnpm -C desktop ui:typecheck`
- `pnpm -C desktop ui:lint`
- `pnpm -C desktop ui:test`
- `pnpm -C desktop docs:lint` when markdown is touched

## Session Log
- 2026-03-03:
  - Step A started.
  - Pages moved from flat `src/pages` into `src/features/*/pages`.
  - Router split into feature modules and composed in `routes.ts`.
