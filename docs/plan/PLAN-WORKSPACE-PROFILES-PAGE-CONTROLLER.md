# Plan: Workspace Profiles Page Controller Simplification

Status: implemented  
Owner: UI / Maintainers  
Last updated: 2026-03-10

## Objective

Refactor `desktop/ui/src/features/workspace/pages/ProfilesPage.vue` and its orchestration modules to a simpler Path 2 architecture:

- keep the page as a render container,
- replace transport-heavy action/runtime composition with a semantic split,
- preserve current route/store/IPC behavior,
- clarify which parts of the current UI governance remain valid and which parts should evolve.

## Real need

The current workspace profiles flow works, but the implementation cost is too high for the amount of product behavior it carries.

Current pain is not mainly in the page SFC itself. The friction comes from the orchestration spread across:

- `useProfilesPageState.ts`
- `profilesPageRuntime.ts`
- `profilesCreateSwitchActions.ts`
- `profilesManageActions.ts`
- `profilesPageHelpers.ts`

For basic flows like create, rename, switch, and delete, the current design requires tracing through several files and nested `state.identity / state.model / state.ui` transport objects.

The real simplification goal is:

- fewer files to open for one user action,
- clearer ownership of side effects vs derived labels,
- less ceremony without regressing testability.

## Proposed target architecture (Path 2)

Target shape:

- `features/workspace/pages/ProfilesPage.vue`
- `features/workspace/composables/useProfilesPageController.ts`
- `features/workspace/composables/profilesViewModel.ts`
- `features/workspace/composables/profilesCommands.ts`
- `features/workspace/composables/profilesPageHelpers.ts`

Responsibilities:

### `ProfilesPage.vue`

- page composition root only,
- local `useI18n()` ownership,
- single `vm` consumption,
- render-only template bindings.

### `useProfilesPageController.ts`

- page wiring only,
- route query handling (`?create=...` focus behavior),
- bootstrap/mount effects,
- ref ownership for create input, rename inputs, and delete dialog,
- composition of view-model + commands into one flat page API.

### `profilesViewModel.ts`

- derived labels and menu state,
- `deleteDialogTitle`,
- `deleteDialogBody`,
- row/menu descriptors if they remain non-trivial,
- no store writes and no router side effects.

### `profilesCommands.ts`

- create, switch, start/cancel/confirm rename, request/cancel/confirm delete,
- validation and duplicate-name checks,
- store calls and router redirects,
- error normalization and async flags.

### `profilesPageHelpers.ts`

- pure helpers only:
  - initials,
  - meta formatting,
  - input resolution,
  - localized error mapping only if kept pure enough.

## Alignment with previous plans and rules

This plan stays aligned with the current UI governance on the points that still solve the real problem:

- `docs/plan/PLAN-UI-FEATURE-RULES-ROLLOUT.md`
  - keep single `vm` page consumption,
  - keep page-local i18n ownership,
  - keep the page composition-root header.
- `spec/active/ui/SPEC-UI-RUNTIME-INPUT-CONTRACT.md`
  - keep explicit boundary thinking,
  - keep side effects out of pages,
  - keep command-shaped APIs instead of raw mutation exports.
- `docs/plan/PLAN-TALKS-VUE3-SOTA.md`
  - keep page-as-container reasoning,
  - keep reusable orchestration rules where async complexity is high.

## Required clarification against previous direction

This plan intentionally challenges one part of the recent direction:

- the current repository trend assumes that more runtime/action splitting is generally a maintainability win.

For `ProfilesPage`, that assumption is too broad.

Clarification from the real need:

- we still want explicit boundaries,
- we do not want boundary transport layers that add indirection without real reuse,
- we prefer semantic modules (`controller`, `commands`, `view-model`) over plumbing modules (`runtime`, `state`, action factory fan-out).

This is not a rollback of the broader UI rules.
It is a refinement:

- preserve page/container rules,
- preserve explicit command boundaries,
- remove oversplitting when the feature does not justify it.

## Decision statement for this plan

For moderate CRUD-style feature pages, semantic split is preferred over transport split:

- prefer `controller + commands + view-model + pure helpers`,
- avoid `pageState + runtime + createActions + manageActions` unless multiple modules are independently reused or async policy is materially complex.

Status in this document: proposed implementation rule for workspace profiles, with cross-feature evaluation below before wider rollout.

## Why this is simpler

Compared with the current implementation, Path 2 reduces complexity in three concrete ways:

1. One action trace becomes local.
   Example: `confirmRename` should be understandable from one command module, not from a page-state wrapper plus runtime composition plus manage-actions helper.

2. Derived UI text becomes isolated.
   Dialog copy and menu descriptors belong to a view-model boundary, not mixed into action wiring.

3. Lifecycle becomes explicit.
   Route focus and bootstrap behavior live in one controller instead of being hidden in a separate lifecycle binder layer.

## Non-goals

- no route URL changes,
- no backend IPC/schema changes,
- no store public API rewrite,
- no visual redesign of the profiles page,
- no forced adoption of this pattern across the whole UI in the same pass.

## Execution plan

Legend:

- `[ ]` pending
- `[~]` in_progress
- `[x]` implemented

- [ ] P1. Document the target API before code movement.
  - Define the flat page contract returned by `useProfilesPageController`.
  - Freeze command names and derived-state names to avoid churn during file moves.

- [ ] P2. Extract pure view-model logic.
  - Move delete-dialog copy and any row/menu derivation to `profilesViewModel.ts`.
  - Keep zero side effects in this module.

- [ ] P3. Extract command logic.
  - Move create/switch/rename/delete flows into `profilesCommands.ts`.
  - Flatten current `identity/model/ui` transport inputs into a smaller semantic command context.

- [ ] P4. Build the page controller.
  - Create `useProfilesPageController.ts`.
  - Own lifecycle, refs, route query reactions, and composition of commands + derived state.

- [ ] P5. Retire oversplit workspace modules.
  - Remove or supersede:
    - `useProfilesPageState.ts`
    - `profilesPageRuntime.ts`
    - `profilesCreateSwitchActions.ts`
    - `profilesManageActions.ts`
  - Keep `profilesPageHelpers.ts` only if it remains mostly pure.

- [ ] P6. Preserve and adapt tests.
  - Keep behavior coverage for create/switch/rename/delete flows.
  - Add controller-level tests for mount/query focus behavior if not already covered elsewhere.
  - Avoid replacing readable unit tests with integration-only coverage.

- [ ] P7. Review for cross-feature applicability after workspace parity.
  - Capture what clearly improved.
  - Capture what should remain workspace-specific.
  - Update active governance only if the pattern proves reusable.

## File-by-file migration sequence

This sequence is intended to preserve behavior at each step and keep the diff reviewable.

### Step 1: freeze the target page API

Create the target surface for `useProfilesPageController.ts` on paper before moving code.

Expected page contract:

- refs:
  - `createSection`
  - `createInput`
  - `setRenameInput`
- read state:
  - `profiles`
  - `activeProfileId`
  - `name`
  - `renameValue`
  - `editingId`
  - `deleteTarget`
  - `error`
  - `isSaving`
  - `isRenaming`
  - `deletingId`
- derived view:
  - `deleteDialogTitle`
  - `deleteDialogBody`
  - `profileMenuItems`
  - `formatProfileMeta`
  - `initialsFor`
- commands:
  - `focusCreateForm`
  - `createProfile`
  - `switchProfile`
  - `startRename`
  - `confirmRename`
  - `cancelRename`
  - `requestDelete`
  - `confirmDelete`
  - `cancelDelete`

Reason:

- the page file should change once, late in the migration,
- command and view-model extraction can happen behind a stable contract.

### Step 2: reduce `profilesPageHelpers.ts` to pure helpers

Touch:

- `features/workspace/composables/profilesPageHelpers.ts`

Keep here:

- `resolveInputElement`
- `toLocalizedError` only if kept stateless and UI-agnostic enough
- `formatProfileMeta`
- `initialsFor`

Move out later:

- `createProfilesState`
- `createRenameInputs`
- any helper whose main job is orchestrating page-local mutable state

Challenge:

- if a helper allocates refs or owns workflow state, it is not a helper anymore.

### Step 3: create `profilesViewModel.ts`

Add:

- `features/workspace/composables/profilesViewModel.ts`

Initial extraction targets from current code:

- delete dialog title/body derivation currently in `useProfilesPageState.ts`
- row menu descriptors currently created in `profilesManageActions.ts`

Rules:

- accept reactive inputs and return derived values only,
- no store writes,
- no router calls,
- no `nextTick`,
- no lifecycle hooks.

Suggested boundary:

- input:
  - `t`
  - `deleteTarget`
  - ui flags needed for menu disablement
- output:
  - `deleteDialogTitle`
  - `deleteDialogBody`
  - `buildProfileMenuItems(profile)`

### Step 4: create `profilesCommands.ts`

Add:

- `features/workspace/composables/profilesCommands.ts`

Extract and merge logic from:

- `profilesCreateSwitchActions.ts`
- `profilesManageActions.ts`

Command groups inside one module:

- create/switch commands
- rename commands
- delete commands

Dependencies should be semantic, not transport-heavy.

Prefer this kind of input:

- `router`
- `t`
- `state`
  - `name`
  - `renameValue`
  - `renameOriginal`
  - `editingId`
  - `deleteTarget`
  - `error`
  - `isSaving`
  - `isRenaming`
  - `deletingId`
  - `activeProfileId`
- `refs`
  - `createInput`
  - `createSection`
  - `focusRenameInput`
- `deps`
  - `createProfile`
  - `switchProfile`
  - `renameProfile`
  - `deleteProfile`
  - `hasDuplicateName`
  - `toLocalizedError`

Avoid reintroducing:

- nested `identity/model/ui` objects,
- a second action-factory layer,
- command modules that only forward arguments to smaller command modules.

### Step 5: create `useProfilesPageController.ts`

Add:

- `features/workspace/composables/useProfilesPageController.ts`

Move here:

- route and router access,
- page refs,
- page-local refs previously created through `createProfilesState`,
- rename-input registration,
- mount/bootstrap behavior from `bindProfilesLifecycle`,
- `?create=` route reaction,
- composition of commands and view-model into one returned object.

The controller should be the only place using:

- `useRoute`
- `useRouter`
- `onMounted`
- `watch`

The controller should not contain:

- long CRUD command bodies,
- label formatting logic,
- more than one layer of internal adapter wrappers.

### Step 6: switch the page to the controller

Modify:

- `features/workspace/pages/ProfilesPage.vue`

Change:

- replace `useProfilesPageState()` with `useProfilesPageController()`

Keep:

- page-local `useI18n()`
- single `vm`
- composition-root header comment

Review requirement:

- the template should remain almost unchanged,
- if template changes grow large, the controller boundary is probably unstable.

### Step 7: remove superseded orchestration files

Delete or fully deprecate:

- `features/workspace/composables/useProfilesPageState.ts`
- `features/workspace/composables/profilesPageRuntime.ts`
- `features/workspace/composables/profilesCreateSwitchActions.ts`
- `features/workspace/composables/profilesManageActions.ts`

Before deletion, confirm:

- no remaining imports,
- tests reference the new controller/commands/view-model structure,
- no hidden support code still depends on the old module names.

### Step 8: rebalance tests by layer

Keep or add tests in the new structure:

- `profilesCommands.test.ts`
  - create validation
  - duplicate-name rejection
  - switch no-op on current profile
  - rename cancel/no-op cases
  - delete confirmation/error flow
- `profilesViewModel.test.ts`
  - dialog copy derivation
  - menu disablement and callbacks presence
- `useProfilesPageController.test.ts`
  - bootstrap error mapping
  - `?create=` focus behavior
  - returned contract wiring smoke checks

Do not overtest:

- pure formatting helpers already covered elsewhere,
- template rendering details better handled by existing component/page tests if present.

### Step 9: post-refactor review against the plan’s real goal

Before calling the refactor complete, verify these review questions:

- Can `create profile` be understood from controller + commands only?
- Can `rename profile` be understood from controller + commands + view-model only?
- Is any module left that mainly exists to pass refs through another layer?
- Did we reduce conceptual steps, not just move code?

If the answer to any of these is no, the refactor is incomplete.

## Validation gates

- `pnpm -C desktop ui:typecheck`
- `pnpm -C desktop ui:lint`
- `pnpm -C desktop ui:lint:feature-rules`
- targeted `pnpm -C desktop ui:test -- ...profiles...`
- `pnpm -C desktop docs:lint`

If a gate cannot run, PR notes must say why.

## Risks and design checks

### Risk 1: fake simplification by moving complexity sideways

Failure mode:

- replace four small files with three files that still pass refs and nested state bags around.

Check:

- command inputs must be semantic and small,
- controller must not reintroduce the same transport hierarchy under new names.

### Risk 2: over-generalizing from one page

Failure mode:

- promote workspace-specific decisions to a global rule too early.

Check:

- treat workspace profiles as a pilot,
- only generalize after comparing with at least one other moderate-complexity feature page.

### Risk 3: collapsing useful async boundaries

Failure mode:

- remove explicit boundaries that talks/support runtimes genuinely need.

Check:

- do not apply this plan mechanically to high-orchestration runtimes.

## Cross-feature evolution challenge

This plan should not become a blanket rule.
It should become a selective pattern with an explicit applicability test.

### Good candidates for the same pattern

Use `controller + commands + view-model + helpers` when a page has:

- moderate CRUD or settings behavior,
- local dialog/focus state,
- limited async concurrency,
- little or no shared orchestration reuse.

Likely candidate families:

- workspace/profile management,
- support/settings subsections with local persistence and dialog flows,
- packs or other list-management pages if their orchestration remains moderate.

### Bad candidates for the same pattern

Do not force this pattern onto pages with:

- heavy multi-source loading,
- explicit concurrency policies,
- significant shared runtime reuse across several pages,
- complex guard layering tied to route/project/profile identity.

Likely non-candidates:

- talks runtimes,
- recorder/ASR orchestration,
- pages already benefiting from explicit multi-plane runtime contracts.

## Proposed reusable rule if the pilot succeeds

If the workspace pilot proves better after code review and tests, evolve the UI rule set as follows:

- keep the existing page-level rules (`single vm`, local i18n, page header),
- add a new decision guideline:
  - moderate feature pages prefer semantic split (`controller`, `commands`, `view-model`) over transport split,
  - runtime-style multi-plane contracts remain preferred for high-orchestration features.

This would be an evolution of existing UI governance, not a contradiction.

## Acceptance criteria

- `ProfilesPage` behavior is unchanged for create, switch, rename, delete, and create-focus-from-route flows.
- A reviewer can trace each user action through at most:
  - page,
  - controller,
  - commands or view-model.
- No remaining nested transport contract equivalent to current `identity/model/ui` fan-out is required for simple commands.
- Tests remain readable and behavior-focused.
- The resulting architecture can be evaluated honestly for at least one additional feature, but is not yet mandated globally.

## Follow-up after implementation

- Compare the resulting workspace page with one additional feature page before changing shared governance docs.
- If the pattern proves reusable, update:
  - `docs/plan/PLAN-UI-FEATURE-RULES-ROLLOUT.md` or its successor policy document,
  - `spec/active/ui/SPEC-UI-RUNTIME-INPUT-CONTRACT.md`,
  - `spec/active/DECISIONS.md`.

## Cross-feature comparison

### Comparison target: `features/packs/pages/PacksPage.vue`

Comparison date: 2026-03-10

Why this page was chosen:

- moderate page size,
- single page + state + runtime structure,
- not as heavy as talks/recorder,
- still representative of a non-trivial feature flow.

Observed architecture:

- page: `PacksPage.vue`
- state wrapper: `usePacksPageState.ts`
- runtime: `packsPageRuntime.ts`
- helpers: `packsPageHelpers.ts`

### Packs-specific differences from workspace profiles

`PacksPage` has genuine runtime concerns that justify a runtime-style module:

- explicit `singleFlight` policy for `pickPack` and `importReview`,
- Tauri dialog dependency,
- drag-drop window listener lifecycle,
- bootstrap + listener attach/detach flow,
- runtime error category handling (`validation`, runtime UI error helpers),
- import inspection and import execution as separate async stages.

This is materially different from workspace profiles, where the dominant behavior is moderate CRUD with local focus/dialog state.

### Packs comparison conclusion

The workspace semantic split should not be promoted as a new default rule from this comparison alone.

Current evidence supports a selective rule:

- workspace profiles: semantic split is a better fit,
- packs import: runtime-style orchestration remains a better fit.

### Packs comparison governance implication

No cross-feature governance promotion yet.

Refined working rule after this comparison:

- use `controller + commands + view-model` for moderate CRUD/settings pages,
- keep runtime-style grouped contracts for features with meaningful async policy, lifecycle listeners, or multi-stage orchestration.

### Comparison target: `features/support/pages/SettingsPage.vue`

Comparison date: 2026-03-10

Why this page was chosen:

- support/settings was already listed as a likely good candidate family,
- it is closer to a moderate control-center page than packs import,
- it already uses a controller surface and page-level `vm` contract.

Observed architecture:

- page: `SettingsPage.vue`
- page controller: `useSettingsPageController.ts`
- semantic sub-composables:
  - `useSettingsInsights.ts`
  - `useSettingsPreferences.ts`
- runtime-heavy ASR subsection:
  - `useSettingsAsrModels.ts`
  - `settingsAsrModelRuntime.ts`
  - `settingsAsrModelLifecycle.ts`
  - `settingsAsrModelActions.ts`

### Settings-specific differences from workspace profiles

`SettingsPage` is not a single-flow CRUD page like workspace profiles.
It is already a composed control center that mixes:

- simple preference bindings,
- derived insights read models,
- heavier ASR model runtime/lifecycle behavior.

That makes it a hybrid case:

- the page-level controller is a good fit,
- simple preference/insight sections already behave like semantic modules,
- ASR model management still benefits from runtime-style boundaries.

### Settings comparison conclusion

`SettingsPage` supports the refined selective rule.

It does not argue for converting everything to the workspace pattern.
Instead, it shows that the best reusable direction is layered:

- page-level controller for composition,
- semantic modules for moderate preference/insight sections,
- runtime-style modules retained for async/lifecycle-heavy subsections.

### Settings comparison governance implication

This comparison strengthens one part of the candidate rollout:

- support/settings subsections remain plausible future adopters of semantic split where flows are moderate,
- but runtime-heavy support areas like ASR model management should keep their current runtime-oriented structure.

## Execution log

- 2026-03-10:
  - Replaced workspace profiles orchestration split (`useProfilesPageState`, `profilesPageRuntime`, `profilesCreateSwitchActions`, `profilesManageActions`) with:
    - `useProfilesPageController`
    - `profilesCommands`
    - `profilesViewModel`
    - reduced `profilesPageHelpers`
  - Kept `ProfilesPage.vue` on single-`vm` consumption and local i18n ownership.
  - Preserved behavior coverage with new targeted tests:
    - `profilesCommands.test.ts`
    - `profilesViewModel.test.ts`
    - `useProfilesPageController.test.ts`
- 2026-03-10:
  - Compared the workspace pilot against `PacksPage`.
  - Result:
    - workspace profiles confirms the semantic split for moderate CRUD flows,
    - packs import confirms runtime-style orchestration is still the better fit for async/lifecycle-heavy features,
    - no broader governance promotion yet.
- 2026-03-10:
  - Compared the workspace pilot against `SettingsPage`.
  - Result:
    - settings confirms page-level controller composition as a good fit,
    - simple support subsections align with semantic module boundaries,
    - ASR model management remains a good example of a subsection that should keep runtime-oriented structure.
