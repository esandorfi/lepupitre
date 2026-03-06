# Global Architecture Discovery Report

## 0. Analysis Target
- Target directory: `desktop/ui`
- Analysis scope: all files under `desktop/ui` (with emphasis on `src/`, `package.json`, `tsconfig`, `eslint`, `vite` config, and scripts)
- Root-level files also inspected:
  - `README.md`
  - `docs/README.md`
  - `docs/IMPLEMENTATION_PLAN.md`
  - `docs/CONTRIBUTION_RULES.md`
  - `desktop/package.json`
  - `desktop/pnpm-workspace.yaml`
  - `scripts/check-domain-structure.sh`
- Excluded areas:
  - unrelated sibling apps outside `desktop/ui`
  - Rust backend deep implementation details (`desktop/src-tauri`) except boundary rules

---

## 1. Repository Context
- Product/app area: desktop UI for a local-first Tauri coaching app
- Detected stack:
  - Vue 3 (`<script setup>`)
  - Vite
  - Vue Router
  - Nuxt UI (`@nuxt/ui`)
  - Tailwind v4
  - TypeScript strict mode
  - Vitest
  - Zod
  - Tauri APIs/plugins
- Framework/runtime signals:
  - Tauri runtime detection and fallback in `src/lib/runtime.ts`
  - IPC command layer through `invokeChecked()` in `src/composables/useIpc.ts`
  - Event-stream integration via `@tauri-apps/api/event`
- UI layer detected:
  - Nuxt UI primitives (`UCard`, `UButton`, `UFormField`, `USelect`, etc.)
  - large custom semantic class system in `src/assets/main.css` (`app-*` tokens and utility wrappers)
- State layer detected:
  - custom reactive singleton `appState` + factory stores in `src/stores/*`
  - feature-local refs/computed/watch for view-specific state
- Validation/testing/tooling signals:
  - Zod schemas for IPC payload/response and event contracts (`src/schemas/*`)
  - ESLint directional rule banning direct IPC usage from feature pages
  - design guard script (`scripts/design-guard.mjs`)
  - Vitest suite focused on `lib/`, `schemas/`, router, and selected composables
- Directory maturity: mixed (strong patterns in IPC/contracts and domain APIs; visible drift in orchestration complexity and styling migration)
- Shared workspace dependencies influencing this area:
  - `desktop/package.json` scripts (`ui:lint`, `ui:typecheck`, `ui:test`, `ui:lint:design`)
  - `scripts/check-domain-structure.sh` enforces UI domain API dependency direction and file budgets

### Evidence
- Key config files:
  - `desktop/ui/package.json`
  - `desktop/ui/tsconfig.json`
  - `desktop/ui/eslint.config.cjs`
  - `desktop/ui/vite.config.ts`
  - `desktop/ui/scripts/design-guard.mjs`
- Key folders:
  - `src/domains` (Tauri IPC wrappers)
  - `src/schemas` (Zod contracts)
  - `src/stores` (global app state orchestration)
  - `src/features` (page-level feature modules)
  - `src/lib` (logic/policy helpers + preferences + i18n)
- Key dependencies:
  - `@nuxt/ui`, `tailwindcss`, `zod`, `vue-router`, `@tauri-apps/*`
- Important conventions observed:
  - camelCase UI payloads + snake_case backend response shape preservation in schemas
  - route-module composition per domain
  - page-level bootstrap through `sessionStore.bootstrap()`/`ensureBootstrapped()`

---

## 2. Executive Summary

### Overall maturity
- mixed

### Overall consistency
- medium

### Main strengths
- strong IPC contract discipline (`invokeChecked` + Zod schemas + schema tests)
- clear domain API layer (`src/domains/*/api.ts`) between UI and Tauri commands
- pragmatic feature foldering with route modularization
- meaningful logic-first test coverage in stable modules (`lib`, `schemas`, key composables)
- local-first fallback behavior for preference and runtime handling

### Main risks
- orchestration complexity concentration (`AudioRecorder.vue` 1326 lines, several large pages/composables)
- transitional/refactor drift (orphan runtime helper files in `components/recorder/composables` with `any`-typed dependency bags; not wired)
- styling-system duality (Nuxt UI + large `app-*` class layer) without finalized default
- form validation mostly manual at page level; no shared schema-form boundary yet
- no automated accessibility checks despite increasing UI surface
- lint currently failing on explicit `any` in recorder runtime helper

### Recommended next move
- Standardize current patterns

---

## 3. Domain-by-Domain Analysis

This report applies the same structure per domain:
- observed current pattern
- compared credible paths
- recommended default for `desktop/ui`
- proposed rule direction and alignment status

---

## 4. Required Domains

### 1. Consistency Model

#### Purpose
Define how consistently code follows one architecture and contract style across the directory.

#### Observed Patterns in the Target Directory
- Pattern 1: strict IPC contract gating via domain APIs and Zod.
- Evidence: `src/composables/useIpc.ts`, `src/domains/*/api.ts`, `src/schemas/*`, `src/schemas/ipc.test.ts`.
- Frequency: high.
- Main locations: `src/domains`, `src/schemas`, `src/composables`.
- Confidence: high.

- Pattern 2: feature/page code uses shared stores and local refs/watch; no direct IPC in pages.
- Evidence: ESLint restricted import rule in `eslint.config.cjs`; no hits for `useIpc` in `src/features`.
- Frequency: high.
- Main locations: `src/features/*/pages/*.vue`, `src/stores`.
- Confidence: high.

- Pattern 3: consistency drift in orchestration styles and in-progress recorder extraction.
- Evidence: `src/components/AudioRecorder.vue`, orphan `audioRecorderCaptureRuntime.ts` and `audioRecorderReviewRuntime.ts`.
- Frequency: medium.
- Main locations: `src/components/recorder/composables`.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: keep current hybrid consistency model and rely on convention + review.
- Benefits: minimal process overhead.
- Tradeoffs: drift accumulates; hard to scale contributors.
- Best when: team is very small and context is mostly tacit.

##### Path B
- Description: formalize existing model with directory-scoped rules (boundary, file budgets, naming, testing scope).
- Benefits: preserves current strengths while reducing drift.
- Tradeoffs: needs explicit rulebook and periodic maintenance.
- Best when: architecture already mostly works but inconsistencies appear.

##### Path C
- Description: redesign whole frontend architecture (state, views, data, styling) in one pass.
- Benefits: clean slate consistency.
- Tradeoffs: high migration risk and delivery slowdown.
- Best when: current baseline is fundamentally failing (not the case here).

#### Recommended Default
- Chosen default: Path B.
- Why this default fits this directory: existing architecture is viable; inconsistency is mostly localized and manageable with explicit rules.
- Why other paths are not preferred by default: Path A under-controls growing complexity; Path C is disproportionate.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - all UI/backend calls must go through `src/domains/*/api.ts` + `invokeChecked`.
  - recorder refactors must not leave orphan runtime modules.
  - no `any` in runtime helpers.
- Exceptions that may remain acceptable:
  - temporary dual naming (camelCase/snake_case) strictly at IPC boundary.
- What should be forbidden:
  - direct `@tauri-apps/api/core invoke` usage in features/pages.

#### Current Alignment
- Aligned: IPC/domain boundary discipline.
- Partially aligned: orchestration decomposition in recorder and large pages.
- Not aligned: one lint-breaking `any`-typed runtime dependency bag.
- Unknown: long-term intended landing state for recorder runtime split.

#### Decision Needed?
- Yes.
- If yes, what must be decided: whether to complete recorder runtime extraction now or collapse back to one tested composable model.

---

### 2. Maintainability Model

#### Purpose
Control how easily code can be changed safely over time.

#### Observed Patterns in the Target Directory
- Pattern 1: domain APIs and helper libs isolate logic from UI rendering.
- Evidence: `src/domains/*/api.ts`, `src/lib/*`.
- Frequency: high.
- Main locations: `src/domains`, `src/lib`.
- Confidence: high.

- Pattern 2: large SFC orchestrators still carry heavy responsibility.
- Evidence: `src/components/AudioRecorder.vue` (1326 lines), `src/features/home/pages/HomePage.vue` (497 lines).
- Frequency: medium.
- Main locations: recorder, home, feedback, settings pages.
- Confidence: high.

- Pattern 3: quality gates are present but unevenly strict.
- Evidence: ESLint `max-lines` warnings, `scripts/check-domain-structure.sh` targeted file budgets, lint failure in recorder runtime helper.
- Frequency: high.
- Main locations: lint config + scripts.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: continue with current modular-but-pragmatic model.
- Benefits: low friction.
- Tradeoffs: recurring monolith hotspots.
- Best when: workload is low and contributors are stable.

##### Path B
- Description: container/presenter split for high-complexity SFCs + typed runtime composables.
- Benefits: better readability, testability, onboarding.
- Tradeoffs: moderate refactor effort.
- Best when: complexity is concentrated in a few known files.

##### Path C
- Description: state-machine-first architecture for complex flows.
- Benefits: explicit transitions and stronger correctness.
- Tradeoffs: high conceptual and migration overhead.
- Best when: flows are highly concurrent and failure-sensitive across many modules.

#### Recommended Default
- Chosen default: Path B.
- Why this default fits this directory: a few files drive most complexity; targeted decomposition gives strong ROI without broad rewrite.
- Why other paths are not preferred by default: Path A maintains current risk; Path C is likely over-engineering for most features.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - mandatory decomposition threshold for SFCs and composables over agreed line/function complexity budgets.
  - typed dependency interfaces for runtime helpers.
- Exceptions that may remain acceptable:
  - large i18n message files.
- What should be forbidden:
  - adding new monolithic orchestrators without extraction plan.

#### Current Alignment
- Aligned: helper-lib extraction and domain boundary.
- Partially aligned: feature pages with mixed orchestration density.
- Not aligned: recorder runtime helper typing/lint conformance.
- Unknown: ownership cadence for complexity budgets.

#### Decision Needed?
- Yes.
- If yes, what must be decided: exact hard budgets and whether exceeding them should fail CI or warn-only.

---

### 3. File Size / Bounded Complexity

#### Purpose
Keep files and functions below readability/testing thresholds.

#### Observed Patterns in the Target Directory
- Pattern 1: explicit `max-lines` and `max-lines-per-function` lint warnings.
- Evidence: `eslint.config.cjs`.
- Frequency: global.
- Main locations: all `.ts`/`.vue`.
- Confidence: high.

- Pattern 2: known hotspots exceed warning thresholds.
- Evidence: `AudioRecorder.vue` (1326 lines), `HomePage.vue` (497), `FeedbackTimelinePage.vue` (482), `useRecorderQuickCleanPanel.ts` (445).
- Frequency: medium.
- Main locations: recorder/home/feedback flows.
- Confidence: high.

- Pattern 3: command script enforces some hard file budgets on selected files.
- Evidence: `scripts/check-domain-structure.sh` (specific UI domain API budgets).
- Frequency: limited.
- Main locations: script-defined paths.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: keep soft warning model.
- Benefits: flexible.
- Tradeoffs: hotspot growth remains likely.
- Best when: deliberate manual discipline is strong.

##### Path B
- Description: hard CI budgets for high-risk files + growth delta checks.
- Benefits: objective cap on complexity drift.
- Tradeoffs: occasional friction during refactors.
- Best when: hotspot files are known and recurring.

##### Path C
- Description: no explicit file-size policy.
- Benefits: no immediate friction.
- Tradeoffs: long-term maintainability decline.
- Best when: never (for this directory).

#### Recommended Default
- Chosen default: Path B for hotspot files, Path A for the rest.
- Why this default fits this directory: keeps flexibility while blocking regressions in problematic files.
- Why other paths are not preferred by default: all-soft warnings already show limits; no-policy is unsafe.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - hard cap for `AudioRecorder.vue` until extraction completes.
  - fail lint on `max-lines` in `components/recorder/*` and `features/*/pages/*` above set thresholds.
- Exceptions that may remain acceptable:
  - generated typings and i18n catalogs.
- What should be forbidden:
  - introducing new files >500 lines in feature/page/orchestration zones without explicit waiver.

#### Current Alignment
- Aligned: some script-enforced budgets exist.
- Partially aligned: warnings catch issues but do not prevent them.
- Not aligned: current recorder SFC exceeds intended readability bounds.
- Unknown: planned convergence timeline.

#### Decision Needed?
- Yes.
- If yes, what must be decided: threshold values and whether rules are hard-fail in CI.

---

### 4. Directory Structure

#### Purpose
Define module boundaries and ownership by folder topology.

#### Observed Patterns in the Target Directory
- Pattern 1: clear top-level separation (`features`, `domains`, `stores`, `lib`, `schemas`, `components`).
- Evidence: `src/` directory inventory.
- Frequency: high.
- Main locations: `src/*`.
- Confidence: high.

- Pattern 2: feature modules often use `pages` + local `composables` + local `components`.
- Evidence: `src/features/home`, `src/features/support`.
- Frequency: medium/high.
- Main locations: home/support.
- Confidence: high.

- Pattern 3: shared component buckets remain prominent (`src/components/*`) for cross-feature UI.
- Evidence: shell/workspace/recorder component trees.
- Frequency: high.
- Main locations: `src/components`.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: keep current hybrid structure (feature folders + shared component pools).
- Benefits: already familiar; no major migrations.
- Tradeoffs: ownership ambiguity for reusable-but-domain-specific UI.
- Best when: active migration period.

##### Path B
- Description: stricter feature-first structure; shared components only when reused by 2+ features with stable contracts.
- Benefits: clearer ownership and change blast radius.
- Tradeoffs: requires folder moves and imports churn.
- Best when: boundaries are mature enough.

##### Path C
- Description: pure layer architecture (all pages/components/composables globally grouped).
- Benefits: simple global lookup.
- Tradeoffs: weak domain locality as app scales.
- Best when: very small apps.

#### Recommended Default
- Chosen default: Path A now, converging toward Path B rules.
- Why this default fits this directory: structure is mostly healthy; biggest need is boundary clarity, not topological reset.
- Why other paths are not preferred by default: Path C weakens domain focus.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - new domain-specific components should default to feature-local placement.
  - shared component eligibility criteria (reuse count + stable API).
- Exceptions that may remain acceptable:
  - shell and workspace global components.
- What should be forbidden:
  - adding new cross-feature shared components for single-feature use cases.

#### Current Alignment
- Aligned: top-level layered clarity.
- Partially aligned: some domain-specific components still centralized.
- Not aligned: none critical.
- Unknown: future placement policy for recorder runtime logic.

#### Decision Needed?
- Yes.
- If yes, what must be decided: explicit promote/demote criteria for shared vs feature-local components.

---

### 5. Naming Conventions

#### Purpose
Ensure predictable naming for files, routes, APIs, and data contracts.

#### Observed Patterns in the Target Directory
- Pattern 1: PascalCase for Vue components and pages; `use*` for composables.
- Evidence: `HomePage.vue`, `RecorderQuickCleanPanel.vue`, `useSettingsAsrModels.ts`.
- Frequency: high.
- Main locations: `src/components`, `src/features`.
- Confidence: high.

- Pattern 2: route file naming uses `*.routes.ts`; route names are mostly consistent but include some legacy plurality (`feedbacks`).
- Evidence: router modules.
- Frequency: high.
- Main locations: `src/router`.
- Confidence: medium.

- Pattern 3: intentional casing boundary split (camelCase payloads, snake_case backend records).
- Evidence: `src/schemas/ipc.core.ts`, `src/schemas/ipc.runtime.ts`, schema tests.
- Frequency: high.
- Main locations: `src/schemas`.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: retain mixed naming without explicit written policy.
- Benefits: no migration work.
- Tradeoffs: subtle inconsistency creeps in.
- Best when: tiny codebase.

##### Path B
- Description: codify naming rules per layer (file casing, route naming, UI vs backend field casing).
- Benefits: predictable onboarding and easier reviews.
- Tradeoffs: minor renaming cleanup.
- Best when: contracts are already explicit.

##### Path C
- Description: force single-case conventions everywhere.
- Benefits: superficial uniformity.
- Tradeoffs: breaks useful boundary clarity with backend serde shapes.
- Best when: not this case.

#### Recommended Default
- Chosen default: Path B.
- Why this default fits this directory: naming mostly coherent already; formalizing reduces edge drift.
- Why other paths are not preferred by default: Path A leaves ambiguity; Path C removes useful contract intent.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - component/page files: PascalCase.
  - composables: `use*`.
  - route names: singular canonical nouns unless semantics require plural.
  - backend response types may preserve snake_case; UI state model fields should remain camelCase.
- Exceptions that may remain acceptable:
  - schema-layer snake_case mirrors.
- What should be forbidden:
  - mixing camelCase and snake_case in the same UI-facing state object.

#### Current Alignment
- Aligned: most files/composables.
- Partially aligned: route naming legacy tokens.
- Not aligned: none severe.
- Unknown: whether route name normalization is planned.

#### Decision Needed?
- No immediate blocker.
- If yes, what must be decided: optional cleanup of legacy route-name variants.

---

### 6. Component Architecture

#### Purpose
Define how UI components split presentation, orchestration, and domain interactions.

#### Observed Patterns in the Target Directory
- Pattern 1: component composition for recorder flow panels is in place.
- Evidence: `RecorderCapturePanel.vue`, `RecorderQuickCleanPanel.vue`, `RecorderExportPanel.vue`.
- Frequency: medium/high.
- Main locations: `src/components/recorder`.
- Confidence: high.

- Pattern 2: parent orchestrators still hold substantial business/runtime logic.
- Evidence: `AudioRecorder.vue` script block.
- Frequency: medium.
- Main locations: `src/components`.
- Confidence: high.

- Pattern 3: reusable layout primitives exist (`PageShell`, `PageHeader`, `SectionPanel`) and are adopted.
- Evidence: `src/components/PageShell.vue`, `src/components/PageHeader.vue`, usage across features.
- Frequency: medium/high.
- Main locations: shared components and features.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: continue with smart orchestrator components and presentational children.
- Benefits: straightforward to implement.
- Tradeoffs: orchestrators become hard to test/maintain.
- Best when: few complex flows.

##### Path B
- Description: enforce thin orchestrator + typed runtime/composable controllers + dumb visual components.
- Benefits: clearer contracts and testing seams.
- Tradeoffs: extraction overhead.
- Best when: high-complexity flows (recorder, home orchestration).

##### Path C
- Description: page-level orchestration only; shared components purely stateless.
- Benefits: strong separation.
- Tradeoffs: very heavy pages.
- Best when: component tree complexity is low.

#### Recommended Default
- Chosen default: Path B.
- Why this default fits this directory: existing panel decomposition indicates intended direction; needs completion with typed controllers.
- Why other paths are not preferred by default: Path A already shows hotspot risk; Path C overloads pages.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - orchestration logic for complex components should live in `composables/` with typed interfaces.
  - presentational components should receive derived props/events only.
- Exceptions that may remain acceptable:
  - very small leaf components.
- What should be forbidden:
  - new monolithic multi-phase workflow components without controller extraction.

#### Current Alignment
- Aligned: recorder panel split, layout primitives.
- Partially aligned: main recorder orchestrator still very large.
- Not aligned: orphan runtime helpers not integrated.
- Unknown: planned final component ownership for recorder runtime modules.

#### Decision Needed?
- Yes.
- If yes, what must be decided: final target shape for recorder orchestration and migration strategy.

---

### 7. Composable Architecture

#### Purpose
Define how reactive logic is shared and tested outside SFC templates.

#### Observed Patterns in the Target Directory
- Pattern 1: composables are used effectively in feature hotspots.
- Evidence: `useHomeTrainingOrchestration.ts`, `useSettingsAsrModels.ts`, `useWorkspaceSwitcherActions.ts`.
- Frequency: medium/high.
- Main locations: `features/*/composables`, `components/workspace`.
- Confidence: high.

- Pattern 2: composable tests exist for critical orchestrations.
- Evidence: `useHomeTrainingOrchestration.test.ts`, `useQuestPickerNavigation.test.ts`.
- Frequency: medium.
- Main locations: `features/home/composables`.
- Confidence: high.

- Pattern 3: runtime helper composables with `[key: string]: any` dependency bags reduce type safety.
- Evidence: `audioRecorderCaptureRuntime.ts`, `audioRecorderReviewRuntime.ts`.
- Frequency: localized.
- Main locations: recorder composables.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: keep composables flexible with dynamic dependency objects.
- Benefits: quick refactoring.
- Tradeoffs: weak contracts and lint/type debt.
- Best when: temporary spike/prototype only.

##### Path B
- Description: typed dependency interfaces and narrow surface composables.
- Benefits: stronger type safety, discoverability, testability.
- Tradeoffs: up-front interface definition effort.
- Best when: composables are long-lived architectural units.

##### Path C
- Description: avoid composables for complex workflows; use store-only logic.
- Benefits: single coordination layer.
- Tradeoffs: store bloat and weaker feature locality.
- Best when: global state dominates.

#### Recommended Default
- Chosen default: Path B.
- Why this default fits this directory: composables are already central and tested; typing them fully is the logical next step.
- Why other paths are not preferred by default: Path A is already causing lint issues; Path C reduces modularity.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - composables used in production flow must export typed deps/contracts.
  - no index-signature `any` dependency bags in runtime logic.
- Exceptions that may remain acceptable:
  - short-lived migration scaffolds with expiry note.
- What should be forbidden:
  - introducing new untyped runtime orchestrator modules.

#### Current Alignment
- Aligned: feature composables in home/settings/workspace.
- Partially aligned: recorder extraction.
- Not aligned: lint-breaking `any` usage.
- Unknown: whether runtime helper files are intentionally dormant.

#### Decision Needed?
- Yes.
- If yes, what must be decided: keep and complete runtime helper approach vs remove it.

---

### 8. Data-Fetching Model

#### Purpose
Define how data is loaded, refreshed, and synchronized with UI state.

#### Observed Patterns in the Target Directory
- Pattern 1: imperative async loading from pages/composables using stores.
- Evidence: `onMounted(load...)`, `watch(...)` patterns in feature pages.
- Frequency: high.
- Main locations: `src/features/*/pages`.
- Confidence: high.

- Pattern 2: domain APIs wrap all backend command calls.
- Evidence: `src/domains/*/api.ts`.
- Frequency: high.
- Main locations: domains.
- Confidence: high.

- Pattern 3: no client-side query cache framework (e.g., Vue Query) is used.
- Evidence: dependency list and code usage.
- Frequency: global.
- Main locations: project-wide.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: keep imperative store-driven fetch model with explicit loading/error refs.
- Benefits: simple mental model; aligns with Tauri command semantics.
- Tradeoffs: repeated bootstrap/fetch patterns, no cache dedupe by default.
- Best when: data shapes are small and request volume is moderate.

##### Path B
- Description: adopt query/caching library for automatic dedupe/retry/invalidation.
- Benefits: reduced boilerplate and better stale-state control.
- Tradeoffs: dependency and conceptual overhead; may be excessive for local IPC.
- Best when: higher read concurrency and complex cache lifecycle.

##### Path C
- Description: route-level data prefetch guards with centralized loaders.
- Benefits: uniform navigation data readiness.
- Tradeoffs: guard complexity and reduced local flexibility.
- Best when: strongly route-driven data model.

#### Recommended Default
- Chosen default: Path A with conventions (idempotent loaders, shared `toError`, cancellation/last-write-wins pattern).
- Why this default fits this directory: local IPC latency and workflow shape favor explicit control.
- Why other paths are not preferred by default: Path B/C add complexity without clear current ROI.
- Confidence: medium/high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - each loader should define explicit loading/error/empty contract.
  - shared helper for route bootstrap to reduce copy-paste.
- Exceptions that may remain acceptable:
  - one-off page-specific loaders.
- What should be forbidden:
  - direct IPC calls in pages bypassing domains/stores.

#### Current Alignment
- Aligned: domain APIs and explicit loading states.
- Partially aligned: repeated bootstrap/fetch boilerplate.
- Not aligned: none critical.
- Unknown: whether cache/invalidations will grow significantly.

#### Decision Needed?
- No immediate blocker.
- If yes, what must be decided: trigger condition for moving to query-cache abstraction.

---

### 9. Server/Client Boundaries

#### Purpose
Define strict boundaries between UI code and privileged backend/runtime capabilities.

#### Observed Patterns in the Target Directory
- Pattern 1: runtime checks prevent unsafe command assumptions in UI-only dev mode.
- Evidence: `hasTauriRuntime`, `isUiDevWithoutTauri`, guarded invocation.
- Frequency: high.
- Main locations: `src/lib/runtime.ts`, `src/composables/useIpc.ts`.
- Confidence: high.

- Pattern 2: command boundary is explicit via domain APIs and schemas.
- Evidence: all `src/domains/*/api.ts` use `invokeChecked`.
- Frequency: high.
- Main locations: domains.
- Confidence: high.

- Pattern 3: network use is almost absent, with one explicit probe component using `fetch("https://example.com")`.
- Evidence: `src/components/SecurityProbe.vue`.
- Frequency: low.
- Main locations: SecurityProbe component.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: enforce no-network-by-default UI policy; isolate any probe/testing endpoint behind explicit dev/admin mode.
- Benefits: aligns with product security posture.
- Tradeoffs: less convenience for ad hoc diagnostics.
- Best when: privacy/local-first is a core promise.

##### Path B
- Description: allow controlled direct HTTP usage in feature code.
- Benefits: flexibility for cloud integrations.
- Tradeoffs: boundary erosion and policy ambiguity.
- Best when: product intentionally adds cloud mode.

##### Path C
- Description: move all privileged operations to explicit capability services in domains only.
- Benefits: maximal boundary clarity.
- Tradeoffs: extra adapter layer.
- Best when: security posture is strict and app grows.

#### Recommended Default
- Chosen default: Path A immediately, with optional Path C refinement.
- Why this default fits this directory: matches local-first product stance and existing architecture.
- Why other paths are not preferred by default: Path B conflicts with current security narrative.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - no raw network calls under `src/features`/`src/components` unless explicitly whitelisted.
  - all privileged runtime interactions must traverse domain APIs.
- Exceptions that may remain acceptable:
  - isolated diagnostic probe component explicitly gated.
- What should be forbidden:
  - unmanaged external network calls in production UI flows.

#### Current Alignment
- Aligned: IPC boundary architecture.
- Partially aligned: one network probe component exists.
- Not aligned: no explicit automated rule yet to prevent future raw fetch usage.
- Unknown: whether SecurityProbe is intended for production exposure.

#### Decision Needed?
- Yes.
- If yes, what must be decided: policy for SecurityProbe (`dev-only`, `internal-only`, or removed).

---

### 10. State Management

#### Purpose
Define ownership of global and feature-specific state transitions.

#### Observed Patterns in the Target Directory
- Pattern 1: global reactive singleton state + domain-specific store factories.
- Evidence: `src/stores/appState.ts`, `src/stores/app.ts`.
- Frequency: high.
- Main locations: stores.
- Confidence: high.

- Pattern 2: stores remain thin orchestrators over domain API calls and app state mutation.
- Evidence: `talks.store.ts`, `training.store.ts`, `workspace.store.ts`.
- Frequency: high.
- Main locations: stores.
- Confidence: high.

- Pattern 3: feature-level transient state remains local in pages/composables.
- Evidence: `HomePage.vue`, `QuestPage.vue`, `useSettingsAsrModels.ts`.
- Frequency: high.
- Main locations: features/components.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: keep current custom-store pattern.
- Benefits: simple, explicit, no extra dependency.
- Tradeoffs: fewer built-in devtools/pattern constraints than Pinia.
- Best when: store layer remains disciplined.

##### Path B
- Description: migrate to Pinia for standardized store patterns/devtools ecosystem.
- Benefits: conventional Vue ecosystem integration.
- Tradeoffs: migration cost and possible over-ceremony.
- Best when: store count/complexity grows substantially.

##### Path C
- Description: event-sourced/state-machine architecture for global state.
- Benefits: explicit transitions and replayability.
- Tradeoffs: heavy complexity overhead.
- Best when: strict audit/replay needs.

#### Recommended Default
- Chosen default: Path A with explicit store rules (purity boundaries, mutation conventions, typed selectors).
- Why this default fits this directory: current model is functioning and understandable.
- Why other paths are not preferred by default: no immediate evidence that Pinia/state machine shift is required.
- Confidence: medium/high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - store methods should encapsulate domain calls and state mutation, not UI concerns.
  - avoid store cross-calls except in top-level composition (`app.ts`).
- Exceptions that may remain acceptable:
  - bootstrapping orchestration in session store.
- What should be forbidden:
  - direct appState mutation outside stores/composables with explicit ownership.

#### Current Alignment
- Aligned: clear store files and app composition.
- Partially aligned: some feature logic still bypasses shared orchestration patterns.
- Not aligned: none critical.
- Unknown: long-term scale pressure on custom store model.

#### Decision Needed?
- No immediate blocker.
- If yes, what must be decided: migration trigger criteria to Pinia.

---

### 11. Forms and Validation

#### Purpose
Ensure input flows are validated consistently and safely from UI to backend.

#### Observed Patterns in the Target Directory
- Pattern 1: IPC boundary has strong runtime validation via Zod.
- Evidence: `src/schemas/*`, `invokeChecked`.
- Frequency: high.
- Main locations: schemas/domains.
- Confidence: high.

- Pattern 2: form-level validation is mostly manual imperative checks.
- Evidence: `TalkDefinePage.vue`, `QuestPage.vue`, `ProjectSetupPage.vue`.
- Frequency: high.
- Main locations: feature pages.
- Confidence: high.

- Pattern 3: Nuxt UI form primitives used but without unified schema-form strategy.
- Evidence: `SettingsPage.vue`, workspace/talk forms.
- Frequency: medium/high.
- Main locations: features/components.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: continue manual form validation per page.
- Benefits: low ceremony and direct UX control.
- Tradeoffs: duplication and inconsistency risks.
- Best when: forms are few and simple.

##### Path B
- Description: schema-backed form validation (Zod-derived) in composables for complex forms.
- Benefits: consistency and reuse while preserving UI flexibility.
- Tradeoffs: some upfront abstraction.
- Best when: multiple complex forms share patterns.

##### Path C
- Description: full form framework abstraction for all forms.
- Benefits: high consistency.
- Tradeoffs: overhead and rigid patterns.
- Best when: very large form-heavy product.

#### Recommended Default
- Chosen default: Path B (target only multi-field/high-risk forms first).
- Why this default fits this directory: existing Zod discipline can be extended to forms incrementally.
- Why other paths are not preferred by default: Path A scales poorly; Path C is too heavy.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - each multi-field form should have one validation function/composable.
  - map validation failures to stable user-facing keys, not raw backend strings.
- Exceptions that may remain acceptable:
  - simple one-field toggles.
- What should be forbidden:
  - duplicating identical validation logic across multiple pages.

#### Current Alignment
- Aligned: IPC validation end-to-end.
- Partially aligned: UI form validation style.
- Not aligned: no shared schema-form policy yet.
- Unknown: desired strictness for form abstraction.

#### Decision Needed?
- Yes.
- If yes, what must be decided: which forms graduate first to shared validation composables.

---

### 12. Styling and Design-System Usage

#### Purpose
Define consistent visual language and component styling primitives.

#### Observed Patterns in the Target Directory
- Pattern 1: Nuxt UI is active and configured with default variants.
- Evidence: `vite.config.ts` Nuxt UI plugin setup; widespread `U*` component usage.
- Frequency: high.
- Main locations: all pages/components.
- Confidence: high.

- Pattern 2: extensive custom token and semantic class bridge (`app-*`) still drives much styling.
- Evidence: `src/assets/main.css` large token map and class catalog.
- Frequency: high.
- Main locations: CSS + templates.
- Confidence: high.

- Pattern 3: dedicated design guard script exists and passes.
- Evidence: `scripts/design-guard.mjs`, `pnpm -C desktop ui:lint:design` result.
- Frequency: high.
- Main locations: script + CI/local workflow.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: keep long-term dual system (Nuxt UI + app-specific semantic classes).
- Benefits: flexible migration and branding control.
- Tradeoffs: two sources of truth.
- Best when: custom brand system must diverge significantly from UI kit defaults.

##### Path B
- Description: converge toward Nuxt UI tokens/components as base, keep only thin app semantic layer.
- Benefits: reduced style drift and simpler maintenance.
- Tradeoffs: migration effort and possible visual adjustments.
- Best when: design system modernization is active.

##### Path C
- Description: move to utility-first only with minimal semantic class layer.
- Benefits: fast local styling.
- Tradeoffs: reduced semantic readability and greater duplication risk.
- Best when: small teams favor utility-only style.

#### Recommended Default
- Chosen default: Path B.
- Why this default fits this directory: Nuxt UI is already adopted; current semantic layer is valuable but overly broad.
- Why other paths are not preferred by default: Path A perpetuates dual-maintenance overhead; Path C weakens semantic consistency.
- Confidence: medium/high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - new UI should prefer Nuxt UI primitives and design tokens first.
  - `app-*` classes should focus on semantic wrappers/tokens, not duplicate utility concerns.
- Exceptions that may remain acceptable:
  - branded shell chrome and legacy transitional wrappers.
- What should be forbidden:
  - reintroducing legacy ad hoc style primitives blocked by design guard.

#### Current Alignment
- Aligned: design guard and token discipline.
- Partially aligned: dual-system breadth.
- Not aligned: none catastrophic.
- Unknown: final migration endpoint for `app-*` surface.

#### Decision Needed?
- Yes.
- If yes, what must be decided: acceptable long-term size of custom class layer after Nuxt UI migration.

---

### 13. Accessibility Baseline

#### Purpose
Ensure baseline keyboard/screen-reader usability and semantic correctness.

#### Observed Patterns in the Target Directory
- Pattern 1: many controls include ARIA labels/attributes.
- Evidence: `WorkspaceSwitcher.vue`, `AppHeaderMenu.vue`, `SidebarIconNav.vue`, `TopPrimaryNav.vue`.
- Frequency: medium/high.
- Main locations: shell/workspace/feature interactions.
- Confidence: high.

- Pattern 2: screen-reader announcement channel is present for recorder state.
- Evidence: `AudioRecorder.vue` with `aria-live="polite"` sr-only span.
- Frequency: localized but meaningful.
- Main locations: recorder.
- Confidence: high.

- Pattern 3: no automated a11y test harness detected.
- Evidence: test inventory focused on unit logic; no axe/playwright a11y checks.
- Frequency: global.
- Main locations: test stack.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: rely on manual code review for accessibility.
- Benefits: low setup cost.
- Tradeoffs: regressions can slip.
- Best when: tiny UI surface.

##### Path B
- Description: add lightweight automated accessibility checks for key pages/components.
- Benefits: early regression detection.
- Tradeoffs: some test setup/maintenance.
- Best when: UI surface is growing and dynamic.

##### Path C
- Description: strict full-coverage accessibility E2E suite.
- Benefits: high confidence.
- Tradeoffs: high maintenance and runtime cost.
- Best when: large mature frontend with dedicated QA bandwidth.

#### Recommended Default
- Chosen default: Path B.
- Why this default fits this directory: baseline semantics exist; automation is the missing piece.
- Why other paths are not preferred by default: Path A is insufficient at current scale; Path C is too expensive initially.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - accessibility smoke tests for primary navigation, recorder CTA flow, and key forms.
  - required ARIA labels for icon-only buttons.
- Exceptions that may remain acceptable:
  - visually hidden debug-only controls.
- What should be forbidden:
  - shipping new icon-only actions without accessible names.

#### Current Alignment
- Aligned: many semantic attributes already present.
- Partially aligned: no automated a11y enforcement.
- Not aligned: not enough objective accessibility checks.
- Unknown: keyboard-only journey completeness across all feature pages.

#### Decision Needed?
- Yes.
- If yes, what must be decided: initial a11y automation scope and tooling (`vitest-axe` vs Playwright).

---

### 14. Performance Baseline

#### Purpose
Define performance expectations and guardrails for interactive UI and event flows.

#### Observed Patterns in the Target Directory
- Pattern 1: route-level lazy loading is used broadly.
- Evidence: route components loaded via `() => import(...)`.
- Frequency: high.
- Main locations: `src/router/*.routes.ts`.
- Confidence: high.

- Pattern 2: recorder flow includes telemetry budget logic and fallback polling strategy.
- Evidence: `recorderTelemetryBudget.ts`, `AudioRecorder.vue` timers/fallback control.
- Frequency: medium/high.
- Main locations: recorder/lib.
- Confidence: high.

- Pattern 3: high watcher/computed density in some pages could impact maintainability/perf if uncontrolled.
- Evidence: `HomePage.vue`, `AudioRecorder.vue`.
- Frequency: localized.
- Main locations: home/recorder.
- Confidence: medium/high.

#### Credible Paths

##### Path A
- Description: continue ad hoc optimization where needed.
- Benefits: minimal process.
- Tradeoffs: drift and regression risk.
- Best when: few hot paths.

##### Path B
- Description: define explicit baselines (event rate, payload size, render hotspots) and enforce in tests/scripts.
- Benefits: predictable performance posture.
- Tradeoffs: maintenance of performance checks.
- Best when: one or two critical real-time flows exist (true here).

##### Path C
- Description: comprehensive profiling infrastructure and budgets for all pages.
- Benefits: broad visibility.
- Tradeoffs: heavy overhead.
- Best when: very large frontend.

#### Recommended Default
- Chosen default: Path B focused on recorder and navigation hotspots.
- Why this default fits this directory: performance risk is concentrated and measurable.
- Why other paths are not preferred by default: Path A has weak regression protection; Path C is excessive now.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - preserve recorder telemetry budget contract.
  - cap expensive watcher patterns in single modules.
  - add perf assertions for event payload/rate functions.
- Exceptions that may remain acceptable:
  - temporary heavier computations during UI migration.
- What should be forbidden:
  - unbounded high-frequency UI event handlers without budget checks.

#### Current Alignment
- Aligned: telemetry budget utilities and tests.
- Partially aligned: no broader perf CI checks.
- Not aligned: none critical currently.
- Unknown: long-term rendering cost under larger datasets.

#### Decision Needed?
- No immediate blocker.
- If yes, what must be decided: threshold values for any new performance CI assertions.

---

### 15. Error Handling

#### Purpose
Define consistent error taxonomy, propagation, and user-facing behavior.

#### Observed Patterns in the Target Directory
- Pattern 1: IPC-level standardized error class and codes.
- Evidence: `lib/errors.ts`, `invokeChecked`.
- Frequency: high.
- Main locations: IPC boundary.
- Confidence: high.

- Pattern 2: page/component-level `error` refs with local `toError()` mapping.
- Evidence: many feature pages and recorder component.
- Frequency: high.
- Main locations: features/components.
- Confidence: high.

- Pattern 3: top-level fatal overlay catches runtime/router/unhandled exceptions.
- Evidence: `main.ts` global handlers.
- Frequency: global.
- Main locations: app bootstrap.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: keep local error refs and targeted mapping functions.
- Benefits: contextual user messaging and low complexity.
- Tradeoffs: duplicate mapping logic.
- Best when: error domains are feature-specific.

##### Path B
- Description: centralized UI error bus with typed categories and global presentation policy.
- Benefits: uniform cross-feature handling.
- Tradeoffs: additional abstraction and possible over-centralization.
- Best when: many cross-feature errors share behavior.

##### Path C
- Description: backend-only error handling, minimal UI mapping.
- Benefits: simpler frontend.
- Tradeoffs: poor UX and weak contextual recovery.
- Best when: never for this product.

#### Recommended Default
- Chosen default: Path A with shared mappers for common backend error codes.
- Why this default fits this directory: current context-aware handling works; needs less duplication.
- Why other paths are not preferred by default: full bus is not yet necessary; Path C is unacceptable.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - common backend error code map utility by domain.
  - user-facing strings should route through i18n keys where possible.
- Exceptions that may remain acceptable:
  - temporary raw error surfacing in diagnostics/developer tools.
- What should be forbidden:
  - uncaught promise branches in async UI actions.

#### Current Alignment
- Aligned: baseline error pipelines.
- Partially aligned: duplicated mapping logic.
- Not aligned: localized inconsistencies in message normalization.
- Unknown: desired global policy for toast vs inline vs panel errors.

#### Decision Needed?
- No immediate blocker.
- If yes, what must be decided: shared error UX contract.

---

### 16. Testing Strategy

#### Purpose
Define confidence model and regression detection coverage.

#### Observed Patterns in the Target Directory
- Pattern 1: strong logic-first tests for libs/composables/schemas/router.
- Evidence: 26 test files, 141 tests passing (`pnpm -C desktop ui:test`).
- Frequency: high in non-visual logic.
- Main locations: `src/lib/*.test.ts`, `src/schemas/ipc.test.ts`, router/composable tests.
- Confidence: high.

- Pattern 2: minimal direct component/page rendering tests.
- Evidence: test inventory has no component mount suites for large pages/components.
- Frequency: high (as absence).
- Main locations: testing scope.
- Confidence: high.

- Pattern 3: lint/type gates exist, with current lint breakage on recorder helper typing.
- Evidence: `pnpm -C desktop ui:lint` failure.
- Frequency: current.
- Main locations: lint output.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: keep logic-contract-first tests, expand gradually in high-risk UI workflows.
- Benefits: fast, stable tests aligned with current architecture.
- Tradeoffs: visual/template regressions can slip.
- Best when: logic modules are primary stability contract.

##### Path B
- Description: add component/page integration tests for key workflows.
- Benefits: stronger end-user behavior confidence.
- Tradeoffs: slower/flakier tests if overused.
- Best when: complex interaction flows dominate regressions.

##### Path C
- Description: heavy end-to-end coverage first.
- Benefits: realistic journey validation.
- Tradeoffs: high maintenance and setup.
- Best when: mature QA pipeline exists.

#### Recommended Default
- Chosen default: Path A + selective Path B for recorder/home/talk-define critical journeys.
- Why this default fits this directory: leverages current robust logic tests while closing biggest UI risk gaps.
- Why other paths are not preferred by default: full E2E-first is premature.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - new complex orchestration logic must include unit/composable tests.
  - add integration component tests when touching recorder multi-phase flow or onboarding-critical pages.
- Exceptions that may remain acceptable:
  - simple static pages.
- What should be forbidden:
  - changing IPC contract mapping without updating schema tests.

#### Current Alignment
- Aligned: logic-contract tests and IPC schema coverage.
- Partially aligned: UI integration test depth.
- Not aligned: lint clean-state gate currently red.
- Unknown: desired target ratio of unit vs component integration tests.

#### Decision Needed?
- Yes.
- If yes, what must be decided: minimal required component integration test set for critical flows.

---

### 17. Documentation / ADR / AI-Instruction Strategy

#### Purpose
Ensure architecture intent is discoverable and stable for contributors and coding agents.

#### Observed Patterns in the Target Directory
- Pattern 1: no local `desktop/ui` README/rulebook specific to this frontend architecture.
- Evidence: no markdown docs found under `desktop/ui`.
- Frequency: global for this directory.
- Main locations: `desktop/ui`.
- Confidence: high.

- Pattern 2: repository-level governance/docs are strong and explicit.
- Evidence: `docs/CONTRIBUTION_RULES.md`, implementation plan, AGENTS instructions.
- Frequency: high.
- Main locations: root/docs.
- Confidence: high.

- Pattern 3: tooling scripts encode part of architecture policy.
- Evidence: `design-guard.mjs`, `check-domain-structure.sh`.
- Frequency: medium/high.
- Main locations: scripts.
- Confidence: high.

#### Credible Paths

##### Path A
- Description: keep only root-level architecture documentation.
- Benefits: single central source.
- Tradeoffs: local frontend conventions remain implicit.
- Best when: frontend is very small.

##### Path B
- Description: add concise `desktop/ui` architecture note documenting boundaries, naming, and quality expectations.
- Benefits: lowers onboarding ambiguity and improves agent consistency.
- Tradeoffs: another doc to maintain.
- Best when: UI domain has distinct architecture patterns (true here).

##### Path C
- Description: formal ADR per frontend architectural tweak.
- Benefits: high traceability.
- Tradeoffs: high documentation overhead.
- Best when: major policy decisions only.

#### Recommended Default
- Chosen default: Path B.
- Why this default fits this directory: many conventions are already practiced but not locally documented.
- Why other paths are not preferred by default: Path A is too implicit; Path C too heavy for frequent UI iteration.
- Confidence: high.

#### Proposed Rule Direction
- Rules that should probably be enforced later:
  - maintain a short `desktop/ui/README.md` with architecture boundaries and migration notes.
  - update central docs/decisions only for cross-cutting policy shifts.
- Exceptions that may remain acceptable:
  - tiny local refactors with no architecture impact.
- What should be forbidden:
  - relying solely on implicit conventions for boundary-critical behaviors.

#### Current Alignment
- Aligned: root governance and contribution rules.
- Partially aligned: local frontend architecture guidance.
- Not aligned: no dedicated UI-local architecture doc.
- Unknown: preferred ownership for such local docs.

#### Decision Needed?
- Yes.
- If yes, what must be decided: owner and update process for a `desktop/ui` local architecture note.

---

## 5. Cross-Domain Contradictions

For each contradiction:

- Contradiction: strong decomposition intent vs monolithic recorder orchestrator and dormant runtime extraction modules.
- Evidence: `AudioRecorder.vue` (1326 lines), `audioRecorderCaptureRuntime.ts`, `audioRecorderReviewRuntime.ts` not imported.
- Why it hurts maintainability: duplicates refactor paths and confuses future edits.
- Which domains it affects: consistency, maintainability, file size, component/composable architecture, testing.
- Suggested resolution path: choose one recorder architecture path, then delete or fully integrate dormant modules with typed contracts.

- Contradiction: strict no-direct-IPC page boundary vs mixed placement of workflow logic across pages/components/composables.
- Evidence: ESLint rule bans direct IPC in pages; heavy runtime logic still concentrated in select SFCs.
- Why it hurts maintainability: boundary is only partially mirrored by orchestration patterns.
- Which domains it affects: consistency, maintainability, state/composable architecture.
- Suggested resolution path: require typed orchestration composables for complex multi-step flows.

- Contradiction: design-system migration to Nuxt UI vs large persistent legacy-like `app-*` semantic class surface.
- Evidence: `main.css` extensive `app-*` catalog, Nuxt UI usage across templates.
- Why it hurts maintainability: two parallel styling abstraction layers increase cognitive load.
- Which domains it affects: styling, consistency, performance, accessibility.
- Suggested resolution path: define target steady-state scope for `app-*` classes and enforce via design guard evolution.

- Contradiction: strong runtime typing posture vs explicit `any` dependency bag in recorder runtime helper.
- Evidence: lint failure in `audioRecorderCaptureRuntime.ts` (`[key: string]: any`).
- Why it hurts maintainability: undermines type confidence where complexity is highest.
- Which domains it affects: maintainability, composable architecture, testing.
- Suggested resolution path: replace dynamic dependency bag with explicit typed interfaces.

- Contradiction: local-first/no-network posture vs raw network probe component.
- Evidence: `SecurityProbe.vue` includes `fetch("https://example.com")`.
- Why it hurts maintainability: policy ambiguity for future contributors.
- Which domains it affects: server/client boundaries, security posture, documentation strategy.
- Suggested resolution path: gate this component to dev diagnostics or remove network probe from shipped UI.

---

## 6. Drift Map

### Strongly standardized areas
- IPC contract flow (`invokeChecked` + Zod schemas + domain APIs).
- route module composition and lazy-loading pattern.
- preference/runtime fallback scaffolding.
- logic-first unit testing in `lib/*`.

### Mixed-pattern areas
- recorder workflow orchestration split between giant SFC and separate runtime helper modules.
- form validation style (manual checks vs reusable patterns).
- styling system layering (`U*` + `app-*` bridge depth).

### High-risk drift
- very large orchestration files (`AudioRecorder.vue`, large pages/composables).
- dormant/untyped runtime helper files with lint debt.
- absence of automated accessibility checks.

### Legacy or transitional zones
- CSS semantic class system during Nuxt UI migration.
- route naming leftovers (`feedbacks`).
- potential diagnostics artifacts (`SecurityProbe.vue`) not clearly scoped.

---

## 7. Candidate Non-Negotiables

- Rule: all privileged/backend interactions must remain in `src/domains/*/api.ts` through `invokeChecked`.
- Why it is safe to enforce: already dominant pattern and core reliability backbone.
- Evidence from directory: domain API files; ESLint page import restriction.
- Risk of enforcing: low.
- Suggested enforcement method:
  - command guidance: keep using domain APIs for new backend calls.
  - lint/tooling: add restricted import for direct Tauri invoke outside domains.
  - code review: reject direct invoke in pages/components.
  - codemod: migrate any future direct calls.
  - CI audit: grep + lint rule.

- Rule: no `any` in recorder/runtime orchestration helpers.
- Why it is safe to enforce: current lint already expects explicit typing.
- Evidence from directory: current lint failure in recorder runtime helper.
- Risk of enforcing: low/medium (requires short refactor).
- Suggested enforcement method:
  - command guidance: typed `RuntimeDeps` interfaces.
  - lint/tooling: keep `@typescript-eslint/no-explicit-any` error.
  - code review: reject untyped dependency bags.
  - codemod: none needed.
  - CI audit: `ui:lint`.

- Rule: complex workflow files must respect explicit complexity budgets.
- Why it is safe to enforce: hotspots are clear and repeatedly identified.
- Evidence from directory: line-count outliers + current warning.
- Risk of enforcing: medium (initial refactor cost).
- Suggested enforcement method:
  - command guidance: split orchestration and presentation.
  - lint/tooling: promote max-lines to error in target folders.
  - code review: require decomposition plan for oversized files.
  - codemod: optional extraction templates.
  - CI audit: lint + size script.

- Rule: no raw network calls in production feature/component code unless explicitly whitelisted.
- Why it is safe to enforce: matches local-first posture.
- Evidence from directory: single explicit probe fetch is isolated.
- Risk of enforcing: low.
- Suggested enforcement method:
  - command guidance: use domain-level capability checks only.
  - lint/tooling: restricted syntax for `fetch/http` patterns outside allowed paths.
  - code review: whitelist approval requirement.
  - codemod: migrate probes to dev-only utility.
  - CI audit: grep check.

- Rule: IPC schema changes must keep camelCase request and backend-response casing contracts tested.
- Why it is safe to enforce: already required by contribution policy and tests.
- Evidence from directory: `ipc.test.ts` casing assertions.
- Risk of enforcing: low.
- Suggested enforcement method:
  - command guidance: update `schemas`, `domains`, and tests together.
  - lint/tooling: none.
  - code review: explicit checklist.
  - codemod: none.
  - CI audit: required schema tests.

- Rule: new feature pages should not import `@/composables/useIpc`.
- Why it is safe to enforce: already enforced.
- Evidence from directory: `eslint.config.cjs` rule + no direct imports in features.
- Risk of enforcing: low.
- Suggested enforcement method:
  - command guidance: route through domain API/store/composable controller.
  - lint/tooling: existing `no-restricted-imports`.
  - code review: verify boundary.
  - codemod: replace direct calls where found.
  - CI audit: `ui:lint`.

---

## 8. Domains Requiring Explicit Team Choice

- Domain: recorder orchestration architecture.
- Competing paths: giant orchestrator SFC vs typed runtime composable split.
- Recommended default: typed composable split with strict contracts.
- Key tradeoff: short-term velocity vs long-term maintainability.
- Decision urgency: high.
- Migration impact if chosen: moderate refactor in recorder components/tests.

- Domain: styling convergence endpoint.
- Competing paths: durable dual system vs Nuxt UI-led convergence.
- Recommended default: Nuxt UI-led with thin semantic app layer.
- Key tradeoff: migration effort vs long-term consistency.
- Decision urgency: medium/high.
- Migration impact if chosen: incremental CSS/template cleanup.

- Domain: form validation model.
- Competing paths: manual per-page checks vs schema-backed composables.
- Recommended default: schema-backed for complex forms.
- Key tradeoff: abstraction cost vs consistency.
- Decision urgency: medium.
- Migration impact if chosen: targeted composable additions in talk/workspace/quest flows.

- Domain: accessibility automation baseline.
- Competing paths: manual checks vs targeted automated a11y tests.
- Recommended default: targeted automation for nav/recorder/forms.
- Key tradeoff: test maintenance vs regression detection.
- Decision urgency: medium.
- Migration impact if chosen: test harness setup and CI updates.

- Domain: local UI architecture documentation ownership.
- Competing paths: root-only docs vs `desktop/ui` local rulebook.
- Recommended default: add concise local rulebook.
- Key tradeoff: doc maintenance overhead vs implementation clarity.
- Decision urgency: medium.
- Migration impact if chosen: low (small doc addition and ownership assignment).

---

## 9. Suggested Initial Global Rule Set

- Domain: consistency model
- Draft rule: all Tauri command calls must be wrapped by `invokeChecked` inside `src/domains/*/api.ts`.
- Confidence: high
- Evidence: existing domain APIs and lint boundary policy.
- Open questions: none.
- Enforce now or later: now.

- Domain: composable architecture
- Draft rule: orchestration helper modules must expose typed dependency interfaces; `any` is disallowed.
- Confidence: high
- Evidence: current lint failure and runtime helper drift.
- Open questions: exact interface granularity.
- Enforce now or later: now.

- Domain: file size / complexity
- Draft rule: files above agreed thresholds in recorder/home/feedback orchestration zones require extraction before merge.
- Confidence: medium/high
- Evidence: current line hotspots and lint warning.
- Open questions: exact thresholds and exception workflow.
- Enforce now or later: later (after threshold ratification).

- Domain: server/client boundaries
- Draft rule: raw network calls are forbidden in feature/component code unless path is explicitly whitelisted for diagnostics.
- Confidence: high
- Evidence: local-first product posture + isolated probe.
- Open questions: final status of `SecurityProbe.vue`.
- Enforce now or later: now (with temporary whitelist if needed).

- Domain: forms and validation
- Draft rule: complex multi-field forms must use dedicated validation utilities/composables.
- Confidence: medium/high
- Evidence: repeated manual validation patterns.
- Open questions: which forms are first-wave migrations.
- Enforce now or later: later.

- Domain: testing strategy
- Draft rule: changes to recorder flow logic require matching unit/composable tests; schema boundary changes require IPC schema tests.
- Confidence: high
- Evidence: existing test strengths and policy alignment.
- Open questions: component integration test minimums.
- Enforce now or later: now for logic/schema, later for component integration minimums.

---

## 10. Auditability

### Candidate automated checks
- Check: forbid direct `@tauri-apps/api/core invoke` outside `src/composables/useIpc.ts` and approved domain wrappers.
- Why it matters: preserves IPC boundary safety.
- Difficulty: low.
- Signal quality: high.
- False-positive risk: low.

- Check: ban `any` in `src/components/recorder/composables/*`.
- Why it matters: prevents type erosion in high-complexity runtime code.
- Difficulty: low.
- Signal quality: high.
- False-positive risk: low.

- Check: size/complexity budgets for recorder/home/feedback hotspot files.
- Why it matters: constrains maintainability drift.
- Difficulty: medium.
- Signal quality: medium/high.
- False-positive risk: medium (during controlled refactors).

- Check: grep for raw `fetch(` / `http://` / `https://` usage outside allowlist.
- Why it matters: enforces local-first/no-network default.
- Difficulty: low.
- Signal quality: medium/high.
- False-positive risk: medium (URLs in static docs/strings).

- Check: ensure feature pages do not import forbidden IPC/composable boundary modules.
- Why it matters: keeps layered architecture intact.
- Difficulty: low.
- Signal quality: high.
- False-positive risk: low.

- Check: ensure recorder runtime helper files are either referenced or explicitly excluded as archived.
- Why it matters: catches dead transitional code drift.
- Difficulty: medium.
- Signal quality: medium.
- False-positive risk: low/medium.

- Check: accessibility smoke checks for shell nav and recorder primary controls.
- Why it matters: catches regression in keyboard/screen-reader critical paths.
- Difficulty: medium.
- Signal quality: high.
- False-positive risk: medium.

### Best first checks to automate
1. direct invoke boundary check (domain-only command access).
2. `any`-ban in recorder runtime helpers.
3. raw network call allowlist check.
4. hotspot file-size budget check.
5. accessibility smoke test on shell navigation + recorder CTA controls.

---

## 11. Final Recommendation

### Architecture posture
- conservative standardization

### What to lock now
- IPC/domain boundary model and schema alignment discipline.
- no direct page-level IPC invocation.
- no new untyped runtime helper patterns.
- no unmanaged raw network calls.

### What to observe longer
- recorder extraction path and final composable/controller architecture.
- Nuxt UI migration endpoint and long-term size of `app-*` class layer.
- whether custom state stores need Pinia migration trigger.

### What to avoid doing too early
- full frontend architecture rewrite.
- full E2E-first testing strategy before targeted component/a11y additions.
- aggressive global CSS teardown before design-system target is agreed.

### Best next artifact
- directory-specific rulebook

### Candidate Non-Negotiables (Final)
- keep backend access strictly through `src/domains/*/api.ts` + `invokeChecked`.
- keep IPC schema casing boundaries explicit and tested.
- disallow `any` in runtime orchestration helpers.
- disallow raw network calls in production feature/component paths without explicit whitelist.

### Unresolved Domains Requiring Team Choice (Final)
- recorder orchestration final architecture (single orchestrator vs typed split composables).
- design-system steady state (dual-layer vs Nuxt UI-first convergence depth).
- validation strategy for complex forms.
- accessibility automation baseline/tooling.

### Suggested Next Step (Final)
- ratify 6-8 `desktop/ui` directory rules, then run one targeted recorder refactor pass:
  - either integrate typed runtime helper composables and shrink `AudioRecorder.vue`, or remove dormant helper files and keep one orchestrator with stricter budgets/tests.

### Best Candidates for Future Automation Checks (Final)
1. domain-only IPC invocation audit.
2. recorder runtime `any` prohibition.
3. raw network allowlist enforcement.
4. hotspot file-size budget enforcement.
5. a11y smoke tests for shell navigation and recorder controls.
