# Plan: Talks Feature Vue 3 SOTA and Maintainability

Status: implemented  
Owner: UI / Maintainers  
Last updated: 2026-03-08

## Objective

Bring `desktop/ui/src/features/talks` to a consistent Vue 3 SOTA architecture that remains pragmatic:

- easy to read and evolve,
- explicit runtime contracts,
- low-risk performance improvements,
- stable user behavior.

## Scope

- `desktop/ui/src/features/talks/**`
- related shared runtime contract usage in talks runtimes
- no route/URL changes
- no backend IPC/schema changes

## Philosophical Design (Overall)

## Principle 1: Page as container, runtime as command layer

- `*.vue` pages stay container-oriented:
  - render data,
  - bind events,
  - delegate behavior to composables/runtime commands.
- Runtime modules own side effects, orchestration, and async policy.

## Principle 2: Explicit runtime data planes

Use grouped runtime state:

- `identity`: project/profile/locale keys
- `model`: domain entities and list data
- `draft`: editable transient values
- `ui`: loading/error/status flags

Avoid mixing entity fields and UI flags in the same plane.

## Principle 3: Deterministic async behavior

Every async command must declare behavior:

- `takeLatest` for concurrent loads,
- `singleFlight` for repeated click commands,
- non-blocking stage-marking where product intent is advisory.

## Principle 4: Reuse orchestration, not templates

- extract shared runtime loading patterns before extracting shared page templates.
- keep UI composition expressive; avoid over-abstracting visual blocks too early.

## Principle 5: Performance by simplification

- reduce repeated sequential network/IPC-adapter calls where safe.
- fetch independent datasets in parallel.
- avoid redundant recomputation in page-level computed values.

## Principle 6: Test behavior contracts

- runtime tests are mandatory for orchestration modules:
  - success/failure transitions,
  - concurrency policy assertions,
  - command output and state mutation expectations.

## Principle 7: Vue feature coherence rules

- Import style:
  - use alias imports (`@/features/talks/...`) for cross-folder feature references,
  - keep relative imports only for same-folder local modules/tests.
- Feature-local component text ownership:
  - panels under `features/talks/components` should own i18n labels directly,
  - avoid forwarding translation labels as props unless cross-feature reuse is required.
- Page state API shape:
  - avoid wide destructuring of dozens of fields from page-state composables,
  - prefer grouped page view-model surfaces (`view`, `data`, `actions`) when signatures grow.
- Shared feature context:
  - feature-level identity/project selectors should be centralized in shared composables (`talkFeatureState`) instead of repeated ad hoc computed blocks.
- Composables layout:
  - organize composables by page domain plus `shared`:
    - `composables/shared/*`
    - `composables/talksPage/*`
    - `composables/definePage/*`
    - `composables/builderPage/*`
    - `composables/trainPage/*`
    - `composables/reportPage/*`
    - `composables/exportPage/*`
    - `composables/projectSetupPage/*`

## Backlog

Legend:

- `[ ]` pending
- `[~]` in_progress
- `[x]` implemented

## Wave A: Runtime contract consistency

- [x] A1. Keep grouped runtime state contract in talks runtimes (`identity/model/ui` + optional `draft`).
- [x] A2. Use shared runtime error contract (`runtimeContract`) in talks runtime modules.
- [x] A3. Align builder actions error handling with runtime contract categories.

## Wave B: Data-load orchestration consolidation

- [x] B1. Extract shared talk artifact data loader for train/report/export runtimes.
- [x] B2. Replace duplicated sequential fetching with shared parallelized loading helpers.
- [x] B3. Optional: extract shared `loadTalkPageData` command wrapper if duplication remains high after B1/B2.

## Wave C: Page structure readability

- [x] C1. Split large talks pages into feature-local cards:
  - summary card,
  - quest list card,
  - export runs card,
  - timeline card.
- [x] C2. Keep `TalkStepPageShell` as structural shell and avoid route behavior duplication across talks navigation composition points.

## Wave D: Performance and reactive hygiene

- [x] D1. Parallelize independent report/runs/peer-review fetches.
- [x] D2. Audit expensive computed chains and move deterministic formatting to helpers/view-models when repeated.
- [x] D3. Add low-noise memoization only where measured benefit exists.

## Wave E: Quality gates and guard rails

- [x] E1. Add talks feature file-size budgets for runtime/page hotspots.
- [x] E2. Enforce orchestration test obligation for touched talks runtime/action/loader modules in CI checks.
- [x] E3. Add a talks-specific architecture checklist section in PR guidance.

## Execution log

- 2026-03-08:
  - plan created from talks feature architecture review.
  - Wave B first slice selected for implementation:
    - shared runtime data loader extraction,
    - duplicated loader replacement in train/report/export runtimes,
    - parallel fetch enabled for independent datasets.
  - Wave B first slice implemented:
    - added `talkRuntimeDataLoader.ts` shared loaders,
    - integrated loaders into `talkTrainPageRuntime.ts`, `talkReportPageRuntime.ts`, and `talkExportPageRuntime.ts`.
  - Validation:
    - targeted talks runtime tests passed,
    - UI typecheck passed,
    - UI lint passed (warning-level complexity only, no errors),
    - docs lint passed.
  - Wave A completed:
    - builder actions aligned on `runtimeContract` error category contract,
    - builder state now carries explicit `errorCategory`.
  - Wave B completed:
    - shared `loadTalkPageData` wrapper extracted for bootstrap/project-missing/stale sequencing.
  - Wave C completed:
    - split talks pages into focused feature-local panel components,
    - route literal duplication reduced via `talkRoutes.ts`.
  - Wave D completed:
    - date formatting moved to helper-level formatter cache,
    - summary computation simplified to single-pass aggregation.
  - Wave E completed:
    - file-size guard-rail budgets added for talks hotspots,
    - test-obligation CI checks added for talks runtime/action/loader modules,
    - PR template now includes talks architecture checklist.
  - QA hardening follow-up:
    - route composition centralized through `talkRoutes` across touched talks pages/components/composables/helpers,
    - shared loader direct unit tests added for sequencing contracts (`bootstrap`, `project-missing`, `stale`).
  - Vue coherence follow-up:
    - talks panel components now own local i18n labels (label-prop surface reduced to domain data/actions only),
    - `TalksPage` state API switched to grouped view-model usage to avoid wide destructuring,
    - shared feature identity/project selectors extracted into `talkFeatureState`,
    - talks composables reorganized into page-scoped directories plus `shared`.
