# Plan: Talks Feature Vue 3 SOTA and Maintainability

Status: in_progress  
Owner: UI / Maintainers  
Last updated: 2026-03-09

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

## Principle 8: UI governance priority ladder (P1 -> P2 -> P3)

Adopt an explicit priority order for talks UI consistency decisions:

- P1. App-level defaults first:
  - Use global Nuxt UI defaults as the first contract source (`vite.config.ts` `ui.*.defaultVariants`).
  - Avoid repeating default props in feature templates (for example `size="md"` when `md` is already app default).
  - Use explicit per-component overrides only for justified UX exceptions (icon-only action, danger CTA, compact toolbar context).
- P2. CSS token system second:
  - Keep a minimal, clear token vocabulary and reduce overlapping aliases.
  - Prefer semantic token naming over feature-specific naming.
  - Keep role-based text tokens explicit (for readability and accessibility), even while simplifying total token count.
  - Challenge "single token only" policy:
    - fully collapsing tone + typography into one class can reduce flexibility and increase hidden coupling,
    - use one-class semantic bundles for common cases, but keep orthogonal primitives available for exceptions.
- P3. Feature-level contracts last:
  - Talks-specific visual mappings (such as mascot tone classes) are allowed only when P1 and P2 cannot express intent cleanly.
  - Feature-level helpers must consume app/token-level semantics, not raw ad hoc color/utility conventions.
  - Feature-level exceptions must be documented in talks spec notes.

## Principle 8.1: Canonical token target and deprecation map (Talks scope)

To keep naming clear and migration low-risk, talks uses the following token groups:

- Foundation primitives (remain available):
  - color/tone primitives: `app-text`, `app-muted`, `app-subtle`, `app-link`, `app-danger-text`
  - typography primitives: `app-text-body`, `app-text-meta`, `app-text-eyebrow`, `app-text-subheadline`
- Semantic one-class bundles (preferred for common content states):
  - `app-body-muted` (muted + body role)
  - `app-meta-muted` (muted + meta role)
  - `app-meta-subtle` (dimmed + meta role)
  - `app-meta-danger` (danger + meta role)
  - `app-link-meta` (link + meta role)

Deprecation mapping in talks templates:

- `app-muted app-text-body` -> `app-body-muted`
- `app-muted app-text-meta` -> `app-meta-muted`
- `app-subtle app-text-meta` -> `app-meta-subtle`
- `app-danger-text app-text-meta` -> `app-meta-danger`
- `app-link app-text-meta` -> `app-link-meta`

Migration rule:

- Use semantic one-class bundles by default.
- Use primitives only when a component needs explicit per-axis override (tone without typography change, or inverse).
- Avoid introducing new ad hoc dual-class combinations when a canonical bundle already exists.

## Principle 9: Documentation contract ("why", not noise)

Goal: improve developer context in source files without Python-style over-commenting drift.

- Add short file-level context comments when module intent is not obvious:
  - runtime/composable purpose,
  - boundary assumptions (`state` vs `runtime`, ownership, side-effect limits),
  - policy references when behavior is decision-driven.
- Add function-level doc comments for non-trivial exported helpers/commands:
  - preconditions,
  - invariants,
  - failure behavior or fallback policy.
- Do not comment obvious implementation lines.
- Keep comments stable and concise; stale comments are treated as defects.
- Prefer documenting:
  - why a rule exists,
  - what must not be violated,
  - how this maps to product/runtime policy.
- Prefer not documenting:
  - self-evident assignments,
  - template markup that already reads naturally.

## Principle 9.1: Comment thresholds by module type (G1)

- Runtime files (`*Runtime*.ts`, runtime-like actions/loaders):
  - required:
    - one file-level context comment,
    - one comment for each non-obvious async/race policy,
    - one comment when command ordering is policy-driven.
- Shared helper files (`*Helpers*.ts`, selector/computed helper modules):
  - required:
    - function-level comments only for non-obvious domain policy or fallback behavior.
  - optional:
    - no comments for pure formatting helpers with obvious behavior.
- Page state composables (`use*PageState.ts`):
  - required:
    - one comment if returning grouped view-model surfaces (`view`/`data`/`actions`) to explain boundary intent.
- Vue components (`*.vue`):
  - default:
    - no inline comments.
  - exception:
    - add short comments only when accessibility/business constraints are not inferable from template markup.

## Principle 9.2: Comment examples and anti-patterns (G2)

- Good examples:
  - explain why a loader checks stale guards between each async stage.
  - explain why a command uses `singleFlight` vs `takeLatest`.
  - explain why a selector is centralized in shared feature state.
- Bad examples:
  - "set loading to true" above `isLoading.value = true`.
  - restating variable names without adding policy/boundary meaning.
  - outdated comments describing previous behavior after refactors.

## Principle 10: Talks visual exception registry (F5)

Feature-local visual mappings intentionally outside shared canonical bundles:

- `mascotToneClass` in `talksPageHelpers`:
  - rationale: route-context mascot message kind maps to semantic visual tone (`celebrate`, `nudge`, default).
  - boundary: keep mapping centralized; components consume helper output only.
- `blueprintPercentClass` in `talksPageHelpers`:
  - rationale: completion thresholds map to progress bar color tiers.
  - boundary: threshold policy is domain-facing UI feedback, not generic global token logic.
- `blueprintStepClass` in `talksPageHelpers`:
  - rationale: step completion needs explicit bordered card tone for dense blueprint rows.
  - boundary: keep as helper-level policy to avoid per-template color drift.

Registry maintenance rule:

- Any new talks-only visual mapping must be added to this registry with rationale and boundary note.
- If a mapping becomes shared across features, migrate it from feature helper to app/token layer and update this registry.

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

## Wave F: UI governance simplification (P1/P2/P3)

- [x] F1. App-level default cleanup:
  - remove redundant Nuxt UI default prop repetition in talks templates when equal to app defaults.
- [x] F2. Token simplification inventory:
  - classify existing UI classes into foundations, semantic tokens, and feature aliases,
  - identify overlapping or duplicate classes for deprecation.
- [x] F3. Minimal token target:
  - define a reduced canonical token set with clear naming and migration mapping.
- [x] F4. One-class semantic bundles:
  - introduce clear default bundles for common text usage while preserving orthogonal overrides for accessibility/edge cases.
- [x] F5. Feature-level exception registry:
  - document talks-specific visual mappings that remain outside shared app/token contracts.

## Wave G: Source-context documentation quality

- [x] G1. Define comment thresholds for talks runtime/composable/component modules (when required vs optional).
- [x] G2. Add "why-focused comment" examples and anti-patterns to avoid noisy comments.
- [x] G3. Backfill high-value context comments for talks hotspots (runtime orchestration + non-obvious helper policy modules).

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
- 2026-03-09:
  - governance model extended with explicit UI priority ladder:
    - P1 app-level defaults,
    - P2 simplified CSS token contract,
    - P3 feature-level exceptions.
  - documentation contract added for "why-focused" source comments with anti-noise guardrails.
  - follow-up waves added for token simplification and source-context documentation rollout.
  - execution pass started for governance rollout:
    - F1 completed for talks templates by removing redundant app-default UI props (`button`, `badge`, `card` defaults),
    - G3 started with "why-focused" comments added in talks runtime/shared orchestration hotspots (`talkRuntimeDataLoader`, `talksPageRuntime`, `talkFeatureState`, `useTalksPageState`).
  - token simplification pass:
    - F2 inventory established in talks scope (top repeated tokens observed: `app-text-meta`, `app-muted`, `app-panel`, `app-link`, `app-text-body`),
    - overlapping dual-class text patterns mapped (`app-muted + app-text-meta`, `app-muted + app-text-body`, `app-link + app-text-meta`, `app-subtle + app-text-meta`, `app-danger-text + app-text-meta`),
    - F4 applied with semantic one-class bundles and talks migration:
      - `app-meta-muted`
      - `app-body-muted`
      - `app-link-meta`
      - `app-meta-subtle`
      - `app-meta-danger`
    - orthogonal primitives (`app-muted`, `app-text-meta`, etc.) kept for controlled exceptions.
  - governance formalization follow-up:
    - F3 completed with canonical token target and explicit deprecation mapping in talks scope,
    - F5 completed with a talks visual exception registry (`mascotToneClass`, `blueprintPercentClass`, `blueprintStepClass`),
    - G1/G2 completed with required comment thresholds and concrete good/bad examples.
  - G3 completed:
    - added why-focused orchestration comments in remaining talk runtimes/actions:
      - `talkDefinePageRuntime`
      - `talkTrainPageRuntime`
      - `talkReportPageRuntime`
      - `talkExportPageRuntime`
      - `projectSetupPageRuntime`
      - `talkBuilderPageActions`
