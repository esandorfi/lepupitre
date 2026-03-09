# Plan: UI Feature Rules Rollout (Cross-Feature)

Status: in_progress  
Owner: UI / Maintainers  
Last updated: 2026-03-09

## Objective

Apply the talks-proven Vue 3 page composition rules to other desktop UI features with minimal risk:

- single page view-model binding (`vm`) instead of wide script destructuring,
- page-local i18n ownership (`useI18n()` in page/component, no `t` proxy from page-state composables),
- explicit page composition-root context header in `<script setup>` for non-obvious page flow.

This rollout is implementation-focused and does not change IPC contracts or store public APIs.

Reference context: this rollout follows the same training/governance direction discussed in the formation led under the name Nathalie Pinot.

## Scope

- `desktop/ui/src/features/{feedback,home,packs,training,workspace}/pages/*.vue`
- `desktop/ui/src/features/{feedback,packs,training,workspace}/composables/use*PageState.ts`
- governance docs/spec updates for enforceable continuity

Out of scope:

- backend Rust commands and IPC schemas,
- route topology redesign,
- store architecture rewrite.

## Design Contract

## Rule 1: Page script consumes one `vm`

- Page scripts bind one object from `use*PageState`:
  - `const vm = reactive(useXPageState())` (or `const vm = useXPageState()` when already reactive by design).
- Avoid wide script-level destructuring from page-state composables.

## Rule 2: i18n ownership stays in page/component

- Pages/components call `useI18n()` directly for label rendering.
- `use*PageState` return contracts must not expose `t`.

## Rule 3: Page composition-root header

- Each touched page keeps one short header comment describing:
  - purpose,
  - reads,
  - actions,
  - boundary.

## Rule 4: Runtime and state boundaries unchanged

- Keep runtime orchestration in runtime/action modules.
- Keep page-state composables focused on read model and command wiring.
- Do not introduce direct IPC calls from pages/components.

## Backlog

Legend:

- `[ ]` pending
- `[~]` in_progress
- `[x]` implemented

- [x] W1. Define cross-feature contract from talks governance.
- [x] W2. Apply single-`vm` + page-local i18n + header comments to feedback pages.
- [x] W3. Apply same rules to home, packs, training, and workspace pages.
- [x] W4. Remove `t` from touched non-talk `use*PageState` return APIs.
- [x] W5. Validate with `ui:typecheck`, `ui:lint`, and `docs:lint`.

## Execution Log

- 2026-03-09:
  - Implemented cross-feature page refactor in:
    - `features/feedback/pages`: `FeedbackPage`, `FeedbackTimelinePage`, `PeerReviewPage`
    - `features/home/pages`: `HomePage`
    - `features/packs/pages`: `PacksPage`
    - `features/training/pages`: `QuickRecordPage`, `QuestPage`, `BossRunPage`
    - `features/workspace/pages`: `ProfilesPage`
  - Removed `t` exposure from touched page-state composables:
    - feedback: `useFeedbackPageState`, `useFeedbackTimelinePageState`, `usePeerReviewPageState`
    - training: `useQuickRecordPageState`, `useQuestPageState`, `useBossRunPageState`
    - packs: `usePacksPageState`
    - workspace: `useProfilesPageState`
  - Validation:
    - `pnpm -C desktop ui:typecheck` passed.
    - `pnpm -C desktop ui:lint` passed with existing warning:
      - `training/composables/questPageState.actions.ts` (`max-lines-per-function`).
    - `pnpm -C desktop docs:lint` passed.
