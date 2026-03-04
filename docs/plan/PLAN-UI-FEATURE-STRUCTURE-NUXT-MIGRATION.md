# Plan: UI Feature Structure and Nuxt UI Migration

Status: implemented  
Owner: UI / Maintainers  
Last updated: 2026-03-04

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
- [x] Extract Home page internals into `features/home/components` and `features/home/composables`
- [x] Validate all UI smoke paths after restructure

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
- [x] Migrate recorder composites
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
  - Shared component wave advanced:
    - migrated `AudioRecorder` container to `AppPanel`
    - migrated `WorkspaceSwitcher` action controls to `AppButton`
    - migrated `RecorderAdvancedDrawer` refresh action to `AppButton` and container to `AppPanel`
    - migrated `RecorderQuickCleanPanel` major controls/sections to `AppButton` + `AppPanel` and Nuxt fields (`UInput`/`UTextarea`)
  - Second-pass verification result (component scope): no `app-panel/app-button/app-badge` usages remain outside `src/components/ui/*` wrappers.
  - Shared component wave continued:
    - migrated `AppHeaderMenu` action/toggle groups to `AppButton`
    - migrated `RecorderAdvancedDrawer` form controls to Nuxt primitives (`USelect`/`USwitch`) with typed option maps
  - Completed shared shell/menu Nuxt UI alignment:
    - replaced custom menu panel utility class usage in `AppHeaderMenu` and `WorkspaceSwitcher` with explicit Nuxt-popover content surface tokens
    - replaced custom divider utility usage with `USeparator`
  - Completed recorder composite migration wave:
    - migrated `RecorderAdvancedDrawer` label+field blocks to `UFormField` wrappers around Nuxt controls
    - removed remaining legacy `app-card` usage in recorder quick-clean advanced details
  - Extended Nuxt UI form-field migration in support settings:
    - replaced manual label/select blocks with `UFormField` for navigation, voiceup, and transcription selectors/toggles
  - Home internals extraction started:
    - moved achievement pulse decision logic + type into `features/home/composables/useAchievementPulse.ts`
    - `HomePage` now consumes composable instead of inline implementation
    - moved home page presentation helpers/types into `features/home/composables/useHomePresentation.ts`
    - switched `HomePage` shared imports to `@/` alias form (removed deep relative paths)
    - moved quest picker keyboard/active-row navigation logic into `features/home/composables/useQuestPickerNavigation.ts`
    - `HomePage` now consumes `useQuestPickerNavigation` for focus sync and key handling
    - moved training data orchestration (`loadTrainingData`, `preloadQuestCatalog`, `openQuestPicker`, `focusQuestMapNode`) into `features/home/composables/useHomeTrainingOrchestration.ts`
    - `HomePage` now consumes orchestration composable and keeps page-level watch/mount hooks as composition root
    - moved quest picker UI block into `features/home/components/HomeQuestPickerPanel.vue`
    - `HomePage` now consumes `HomeQuestPickerPanel` as a feature component and keeps only integration state/events
  - Remaining field-label normalization pass:
    - migrated recorder spoken punctuation row to `UFormField` in `RecorderAdvancedDrawer`
    - migrated recorder onboarding audience/goal/duration label groups to `UFormField` in `RecorderQuickCleanPanel`
    - migrated workspace profile create form to `UFormField` and replaced inline rename label with input `aria-label` in `ProfilesPage`
    - verification: no remaining raw `<label>` usage in `desktop/ui/src/**/*.vue` outside wrapper components
  - Second-pass migration audit (Nuxt UI first):
    - no remaining `app-card`, `--app-card`, `app-menu-panel`, `app-divider`, or `app-button/app-badge/app-panel` class usages in Vue files outside wrapper implementations
    - no native `<input|select|textarea|button>` usage in Vue files outside wrapper implementations
    - no deep relative imports to shared UI wrappers (`../../..../components/ui`) remain
    - direct Nuxt primitives (`UFormField`, `UInput`, `USelect`, `USwitch`, `UTextarea`, `USeparator`, `UDropdownMenu`, `UPopover`) are now consistently used in feature and shared pages/components
  - Validation gate pass after recorder + shell wave:
    - `pnpm -C desktop ui:typecheck`
    - `pnpm -C desktop ui:lint`
    - `pnpm -C desktop ui:test`
  - Plan completion checkpoint:
    - Step A feature structure migration is complete (including Home internals split into `components` + `composables`)
    - Step B Nuxt UI first migration is complete across pages and shared components in scope
    - second-pass verification is clean and guard-rail checks are in place
  - Post-completion hardening:
    - added focused unit tests for Home composables:
      - `features/home/composables/useQuestPickerNavigation.test.ts`
      - `features/home/composables/useHomePresentation.test.ts`
    - validation remains green after hardening (`ui:typecheck`, `ui:lint`, `ui:test`)
