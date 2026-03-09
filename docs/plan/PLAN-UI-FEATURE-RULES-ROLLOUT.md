# Plan: UI Feature Rules Rollout (Cross-Feature)

Status: implemented  
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
- `desktop/ui/src/features/support/{pages,components}/**/*.vue`
- `desktop/ui/src/features/{feedback,packs,training,workspace}/composables/use*PageState.ts`
- `desktop/ui/src/features/support/composables/useSettingsPageController.ts`
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
- [x] W6. Apply full-uniformity pass on support pages/components:
  - local i18n ownership in child sections,
  - single-`vm` page consumption in `SettingsPage`,
  - composition-root headers on support pages.
- [x] W7. Add enforceable guardrails:
  - UI feature-rule check for `no :t prop threading` and `single vm page consumption`,
  - CI wiring and validation checklist updates.
- [x] W8. Remove remaining quality warning hotspot:
  - split `training/createQuestActions` orchestration into helper commands.
- [x] W9. Add support regression coverage for settings vm passthrough contract.

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
- 2026-03-09 (guardrails and warning-removal completion):
  - Added `scripts/check-ui-feature-rules.mjs` and wired it to:
    - `desktop/ui/package.json` (`lint:feature-rules`),
    - `desktop/package.json` (`ui:lint:feature-rules`),
    - CI UI job (`UI feature rule guard` step).
  - Added PR/docs governance references for the new gate:
    - `.github/PULL_REQUEST_TEMPLATE.md`,
    - `docs/CONTRIBUTION_RULES.md`,
    - `docs/testing/TEST_MATRIX.md`.
  - Refactored `training/composables/questPageState.actions.ts` to remove `max-lines-per-function` warning by extracting command helpers.
  - Added regression coverage for settings vm controller passthrough:
    - `features/support/composables/useSettingsPageController.test.ts`.
    - `pnpm -C desktop docs:lint` passed.
- 2026-03-09 (support full-uniformity continuation):
  - Refactored `features/support/pages/SettingsPage` to single-`vm` consumption (`reactive(useSettingsPageController())`) and removed wide script destructuring.
  - Removed `t` forwarding from support pages to child components:
    - `HelpTopicSection`, `HelpDevSection`, `HelpActionsSection`,
    - `SettingsNavigationSection`, `SettingsInsightsSection`, `SettingsVoiceupSection`, `SettingsTranscriptionSection`.
  - Moved i18n ownership into support child components (`useI18n()` local usage).
  - Removed `t` from `useSettingsPageController` return API.
  - Added composition-root header comments to support pages:
    - `AboutPage`, `HelpPage`, `OnboardingPage`, `SettingsPage`.
  - Validation:
    - `pnpm -C desktop ui:typecheck` passed.
    - `pnpm -C desktop ui:lint` passed with existing warning:
      - `training/composables/questPageState.actions.ts` (`max-lines-per-function`).
