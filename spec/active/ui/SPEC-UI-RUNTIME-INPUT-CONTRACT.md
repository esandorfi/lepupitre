# UI Runtime Input Contract Refactor (SOTA Target)

- Date: 2026-03-08
- Status: accepted
- Scope: `desktop/ui/src/features/**/composables/*Runtime*.ts`, `*PageRuntime.ts`, runtime-like actions/loaders/helpers
- Related decision: `DEC-20260307-ui-runtime-input-contract`, `DEC-20260308-ui-talks-orchestration-guardrails`, `DEC-20260309-ui-feature-rules-rollout`

## Context

Several feature runtimes currently use wide flat parameter objects with many refs:

- `feedbackPageRuntime.ts`: 12 inputs
- `talkExportPageRuntime.ts`: 12 inputs
- `talkReportPageRuntime.ts`: 12 inputs
- `talkDefinePageRuntime.ts`: 10 inputs
- `talkTrainPageRuntime.ts`: 8 inputs

This works functionally but weakens long-term scalability:

1. signatures are wide and noisy,
2. domain intent is implicit,
3. naming can collide with schema entities,
4. diff quality drops when many fields move together.

## Goal

Define a SOTA-grade runtime contract that is deterministic, typed, testable, and auditable while preserving existing IPC/store boundaries.

## Non-goals

- No backend IPC command/payload/schema change.
- No mandatory store public API rewrite.
- No big-bang migration across all features.

## Help: Runtime vs State

## State

`state` is reactive page data consumed by template/computed selectors.

- It represents current UI truth.
- It does not execute privileged side effects itself.
- It is split into explicit data planes (defined below).

## Runtime

`runtime` is the imperative orchestration layer.

- It receives commands (`loadPage`, `saveNote`, `setActive`, ...).
- It calls side-effect dependencies (`deps`).
- It mutates `state` through deterministic transitions.

## Mental model

- `state` = data container
- `runtime` = command executor

## SOTA Contract (Normative)

The following rules are normative for new or touched runtime modules.

## 1. Data planes are explicit

Runtime input must be grouped and explicit:

```ts
createXRuntime({
  state: {
    identity, // route/profile/project/locale ids and selectors
    model,    // schema-aligned domain entities
    draft,    // editable transient values
    ui,       // loading/error/status and view flags
  },
  deps,       // stores/domain adapters/navigation/clock/logger
})
```

Required constraints:

- `model` fields are schema-aligned domain entities only.
- `ui` fields never duplicate domain entity data.
- `draft` holds user-editable transient values only.
- `identity` holds routing/context keys only.

## 2. Domain model normalization policy

Normalization must be used when either condition is true:

- entity collections are read in multiple places, or
- runtime performs repeated entity lookups/merges by id.

Preferred shape:

- `model.entities.<entity>ById: Ref<Record<string, Entity>>`
- `model.order.<entity>Ids: Ref<string[]>`
- selectors derive read views from `entities + ids`.

Small single-entity pages may keep direct refs.

## 3. Command and transition model

Runtime APIs must be command-shaped, not raw mutation APIs.

- Good: `loadPage`, `saveNote`, `refreshMascotMessage`.
- Avoid: exporting low-level setters as public runtime API.

Each command must define:

- preconditions,
- transition intent (`idle -> loading -> success/error`),
- postconditions on `state`.

## 4. Concurrency and race policy

Each async command must explicitly choose one policy:

- `takeLatest` (sequence guard),
- `singleFlight` (dedupe concurrent calls),
- `queue` (ordered execution),
- `parallel` (explicitly independent operations).

Default for page loading commands: `takeLatest`.

Minimum protections:

- stale response must not overwrite newer state,
- save actions must avoid stale-write regressions,
- timer-based status reset must not clobber active in-flight status.

## 5. Error model and mapping

Runtime must classify errors into stable categories:

- `validation`
- `domain`
- `infrastructure`
- `unknown`

Mapping rules:

- critical command failure updates primary `ui.error`,
- non-critical optional features update local status and degrade gracefully,
- raw unknown errors are normalized before state assignment.

## 6. Side-effect boundary

Runtime side effects must go through `deps` only.

- No direct import of unrelated global singletons inside runtime body when dependency can be injected.
- IPC remains behind domain/store layers (unchanged by this spec).

## 7. Naming contract

- Group names should be domain explicit (`noteDraft`, `projectIdentity`, `timelineUi`).
- Avoid ambiguous names that shadow schema entities.
- Schema entity names remain stable inside `model`.

## 8. Flat args exception policy

Flat argument objects are allowed only if:

- runtime has up to 7 primitive inputs, and
- grouping would not improve domain clarity.

Exception must be documented in file-level comment or spec note.

## 8.1 Feature-fit rule: runtime vs semantic controller

Do not treat runtime-style grouped contracts as the default best fit for every touched feature page.

Choose architecture by orchestration fit:

- Prefer `controller + commands + view-model (+ pure helpers)` when a feature/page is mostly:
  - moderate CRUD or settings behavior,
  - local dialog/focus state,
  - limited async concurrency,
  - low shared orchestration reuse.
- Prefer grouped runtime-style contracts (`state.identity/model/draft/ui + deps`) when a feature/page has:
  - explicit concurrency policy,
  - multi-stage async orchestration,
  - lifecycle listeners/subscriptions,
  - meaningful shared runtime reuse across pages or subsections.

Pilot evidence:

- workspace profiles supports semantic split better than transport split,
- packs import remains a better fit for runtime-style orchestration,
- settings supports a hybrid model:
  - page-level controller for composition,
  - semantic modules for moderate sections,
  - runtime-style modules for ASR-heavy subsections.

## 9. Route composition policy

Navigation paths composed in feature scope must use feature route helpers.

- Applies to pages, components, composables, and helper/view-model modules returning routes.
- Avoid raw string route composition in feature code when a route helper exists.
- Exception is allowed only for one-off global routes with explicit rationale in code comment.

## 10. Feature composable topology policy

When feature composable count grows, organize by page/domain subdirectories plus `shared`.

- Preferred shape:
  - `composables/shared/*`
  - `composables/<pageName>/*` (runtime, helpers, use-state, tests)
- Goal:
  - keep orchestration discoverable,
  - reduce flat-folder entropy,
  - preserve clear ownership boundaries per page flow.

## 11. Page-state consumption style (cross-feature)

For new or touched feature pages that consume `use*PageState`:

- bind one page-level view model:
  - `const vm = reactive(useXPageState())` (or non-reactive wrapper only when already reactive by design),
- avoid wide script-level destructuring from `use*PageState`,
- keep template bindings through `vm.*` for API-change resilience.

## 12. i18n ownership contract (cross-feature)

For new or touched feature pages/components:

- call `useI18n()` directly where labels are rendered,
- do not expose/forward `t` through `use*PageState` return APIs.

This keeps translation boundaries aligned with view ownership and avoids composable surface bloat.

## 13. Composition-root context header (cross-feature)

For touched feature page SFC roots:

- include one short script-level header describing:
  - purpose,
  - reads,
  - actions,
  - boundary.

This improves onboarding and review clarity while keeping templates free of inline comment noise.

## Store Alignment Challenge

Should runtime contracts mirror store contracts exactly?

- Alignment target: design intent (`state + deps`, explicit boundaries).
- Not required: exact identical shape.

Reason:

- stores are domain/application boundaries,
- runtimes are view orchestration boundaries.

Forcing 1:1 shape would over-couple pages to global store structure.

## Testing Obligations (SOTA Minimum)

For each new or changed orchestration module (`runtime`, runtime-like `actions`, shared runtime `loaders`):

1. transition test for success path,
2. transition test for failure path,
3. concurrency test for chosen async policy (when async orchestration is present),
4. one invariant test asserting no cross-plane pollution (`model` vs `ui` vs `draft`) when state mutation is present,
5. direct unit tests for shared loaders/wrappers that coordinate bootstrap/project-missing/stale sequencing.

If command semantics change, update related feature tests in the same MR.

## Auditability and CI candidates

Candidate checks for future enforcement:

1. runtime signature grouping check (`state + deps`).
2. max flat runtime input threshold.
3. forbidden cross-plane assignment patterns.
4. async race guard presence for load/save commands.
5. required orchestration module tests in touched feature scope (`runtime`/`actions`/`loaders`).

## Migration Path (Incremental)

## Phase 1: pilot

- Refactor `feedbackPageRuntime.ts` to full grouped contract with explicit async policy.
- Keep behavior unchanged.
- Add transition and concurrency tests.

## Phase 2: talks family

- Apply contract to:
  - `talkTrainPageRuntime.ts`
  - `talkReportPageRuntime.ts`
  - `talkExportPageRuntime.ts`
- Consolidate shared loading logic only after parity is proven.

## Phase 3: broader consistency

- Apply to remaining runtime-like modules exceeding threshold.
- Keep exceptions explicit and tracked.

## Decision status

Decision is accepted based on end-to-end implementation evidence (runtime modules + runtime-like action modules + page orchestration extraction + tests).

- Decision scope: UI runtime/composable input contracts and runtime-like feature actions.
- Excluded scope: IPC contract redesign and store API redesign.

## Acceptance Criteria (SOTA readiness)

1. New/touched runtimes implement explicit data planes (`identity`, `model`, `draft`, `ui`) plus `deps`.
2. Commands define deterministic transitions and explicit concurrency policy.
3. Error mapping follows category model and critical/non-critical rules.
4. Runtime tests include transition, failure, concurrency, and invariants.
5. No IPC boundary changes are required to adopt this contract.

## Implementation Evidence (2026-03-08)

- Runtime contract helpers added under `desktop/ui/src/features/shared/runtime/runtimeContract.ts`.
- Runtime modules aligned with categorized error mapping and explicit async policy markers:
  - feedback: `feedbackPageRuntime`, `feedbackTimelinePage.runtime`, `peerReviewPageRuntime`
  - talks: `talkTrainPageRuntime`, `talkReportPageRuntime`, `talkExportPageRuntime`, `talkDefinePageRuntime`, `talksPageRuntime`, `projectSetupPageRuntime`
  - packs: `packsPageRuntime`
  - support: `settingsAsrModelRuntime`
  - workspace lifecycle boundary: `profilesPageRuntime`
  - training runtime-like actions: `questPageState.actions`, `bossRunPageState.actions`
- Feature page direct store side effects removed for:
  - `ProjectSetupPage.vue`
  - `PeerReviewPage.vue`
  - `QuickRecordPage.vue`
- Lint guard rails added to block direct store/IPC imports in feature pages/components.
- Runtime tests expanded with categorized-error and concurrency assertions; full UI lint/typecheck/test gates pass.
- Talks route composition now uses `talkRoutes` helpers across pages/components/composables/helpers in touched scope.
- Talks orchestration test-obligation CI guard now includes shared loader modules.
- Talks composables are organized by page-scoped folders plus `shared`.
- Cross-feature page-consumption rollout implemented on 2026-03-09:
  - feedback pages: `FeedbackPage`, `FeedbackTimelinePage`, `PeerReviewPage`,
  - home page: `HomePage`,
  - packs page: `PacksPage`,
  - training pages: `QuickRecordPage`, `QuestPage`, `BossRunPage`,
  - workspace page: `ProfilesPage`,
  - touched non-talk `use*PageState` modules no longer expose `t`.
- Support full-uniformity continuation implemented on 2026-03-09:
  - `SettingsPage` migrated from wide destructuring to single `vm` consumption,
  - support child sections now own i18n locally (`useI18n()` in component scope),
  - `useSettingsPageController` no longer exposes `t` in its return contract,
  - support page roots include composition headers (`About`, `Help`, `Onboarding`, `Settings`).
- Rule enforcement follow-up implemented on 2026-03-09:
  - UI guard script added for:
    - forbidding `:t=` prop threading in feature SFCs,
    - requiring single-`vm` page consumption when `use*PageState/use*PageController` is used,
    - forbidding wide page-level destructuring from page-state/controller composables.
