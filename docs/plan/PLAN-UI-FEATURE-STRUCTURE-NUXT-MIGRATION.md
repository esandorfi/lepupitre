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
- [x] Add minimal wrapper set under `src/components/ui/`
- [x] Refactor shared primitive components to use wrappers/Nuxt
- [x] Migrate support + workspace pages
- [x] Migrate Home feature as a full vertical slice
- [x] Migrate talks + feedback features
- [ ] Migrate recorder composites
- [x] Add guard rails against raw primitive drift in pages

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
  - Step B wave 1 started.
  - Added `AppButton`, `AppPanel`, `AppDialog`, `AppBadge` wrappers under `src/components/ui`.
  - Migrated `ConfirmDialog`, `PageHeader`, and `SectionPanel` to wrappers.
  - Step B wave 2 (partial) continued.
  - Migrated support pages `About`, `Help`, `Onboarding` and workspace page `Profiles` to wrapper-first panels/buttons/badges.
  - Completed `Settings` migration to wrapper-first panels/buttons/badges and Nuxt UI field controls (`USelect`/`USwitch`).
  - Step B wave 3 completed for Home.
  - Migrated `HomePage` primitives to wrapper-first (`AppPanel`, `AppButton`, `AppBadge`) and switched quest picker search input to `UInput`.
  - Step B wave 4 started (talks + feedback).
  - Migrated feedback pages (`FeedbackTimeline`, `Feedback`, `PeerReview`) to wrappers and Nuxt inputs where applicable.
  - Migrated talks hub and setup pages (`Talks`, `ProjectSetup`, `TalkBuilder`) to wrappers and Nuxt inputs.
  - Completed talks wave 4 pages: `TalkDefine`, `TalkTrain`, `TalkExport`, `TalkReport` migrated to wrapper-first + Nuxt field primitives.
  - Added second-pass migration verification rule in `AGENTS.md` with Nuxt UI LLM references and explicit grep checks for raw primitives/legacy classes.
  - Extended page migration pass for training + packs (`Quest`, `BossRun`, `QuickRecord`, `Packs`) to wrapper-first and Nuxt field controls.
  - Second-pass verification result: no remaining `app-panel/app-button/app-badge` classes and no native `input/select/textarea/button` in `src/features/**/pages`.
  - Remaining migration backlog is now concentrated in shared/components scope (not page scope), especially recorder composites and some shell/menu internals.
