# Desktop UI Future Implementation Blueprint

Source baseline: `docs/architecture/reports/desktop-ui.discovery.md`  
Target scope: `desktop/ui/src/{components,features,domains}` (exhaustive file plan)

## 1) Implementation Goal
Define a final, decision-complete target structure for the Vue 3 desktop UI that is:
- coherent (clear layer ownership and dependencies),
- pragmatic (minimal abstraction, strong ROI splits),
- simple (small, single-purpose files),
- SOTA Vue 3 (`<script setup>`, typed composables, bounded reactive effects),
- Nuxt UI first (custom CSS only when justified).

## 2) Hard Architecture Rules (Final State)
- Layer direction (must remain one-way):
- `pages/container` -> `feature composables/controllers` -> `stores` -> `domains` -> `invokeChecked`.

- Domain boundary:
- `src/domains/*` can import schemas and IPC helper modules only.
- `src/domains/*` must never import `components`, `features`, or `stores`.

- File-size budgets:
- Presentational component `.vue`: <= 120 lines.
- Container/page `.vue`: <= 180 lines.
- Runtime/composable/controller `.ts`: <= 160 lines.
- Domain API file `.ts`: <= 120 lines.
- Mapper/normalizer/helper `.ts`: <= 80 lines.

- Responsibility rule:
- One file, one core reason to change.
- Multi-phase workflows must be split into state, runtime events, and presentation selectors.

- Testing rule:
- Every new split in orchestration/runtime requires matching unit/composable tests in same feature area.

## 3) Target Directory Structure (Final Mental Model)

```text
desktop/ui/src
  components
    app/
      AppHeaderMenu.vue
      ConfirmDialog.vue
      PageHeader.vue
      PageShell.vue
      SectionPanel.vue
      EntityRow.vue
    shell/
      WindowChrome.vue
      TopPrimaryNav.vue
      SidebarIconNav.vue
      RouteContextBar.vue
    workspace/
      WorkspaceSwitcher.vue                # container
      WorkspaceSwitcherList.vue            # presentational
      WorkspaceSwitcherCreatePanel.vue     # presentational
      WorkspaceSwitcherRow.vue             # presentational
      composables/
        useWorkspaceSwitcher.ts
        useWorkspaceSwitcherActions.ts
        useWorkspaceSwitcherCreate.ts
        useWorkspaceSwitcherRename.ts
        useWorkspaceSwitcherDelete.ts
        useWorkspaceSwitcherModel.ts
      refs/workspaceSwitcher.refs.ts
    recorder/
      AudioRecorder.vue                    # container
      RecorderCapturePanel.vue
      RecorderQuickCleanPanel.vue          # container
      RecorderExportPanel.vue
      RecorderAdvancedDrawer.vue
      RecorderWaveform.vue
      quick-clean/
        QuickCleanOnboardingSection.vue
        QuickCleanTimelineSection.vue
        QuickCleanTranscriptSection.vue
        QuickCleanActionBar.vue
      composables/
        useAudioRecorderState.ts
        useAudioRecorderPresentation.ts
        useAudioRecorderLifecycle.ts
        runtime/
          audioRecorderRuntimeDeps.ts
          capture.transport.ts
          capture.devices.ts
          capture.status.ts
          capture.telemetry.ts
          capture.trim.ts
          review.transcribe.ts
          review.editor.ts
          review.export.ts
          review.shortcuts.ts
        quickClean/
          quickClean.types.ts
          quickClean.trim.ts
          quickClean.timeline.ts
          quickClean.onboarding.ts
          useRecorderQuickCleanPanel.ts
  features
    home/
      pages/HomePage.vue                   # container only
      components/
        HomeTrainingHeroHighlights.vue
        HomeTrainingSidebar.vue            # split into cards
        HomeQuestPickerPanel.vue
        HomeQuestPickerRow.vue
        HomeQuestAlternatePanel.vue
      composables/
        useHomePageState.ts
        useHomeQuestSelection.ts
        useHomeTrainingOrchestration.ts
        useQuestPickerNavigation.ts
        useHomePresentation.ts
        useAchievementPulse.ts
    talks/
      pages/                               # container-only pages
      components/                          # step/form/report cards
      composables/                         # per-page controllers
    feedback/
      pages/                               # container-only pages
      components/                          # timeline/list/filter widgets
      composables/
    support/
      pages/
      components/                          # settings/help sections
      composables/
        settings/
    training/
      pages/
      components/
      composables/
    workspace/
      pages/
      components/
      composables/
    packs/
      pages/
      components/
      composables/
  domains
    asr/
      api.ts
      commands.ts
      mappers.ts
    coach/
      api.ts
    feedback/
      api.ts
    pack/
      api.ts
    quest/
      api.ts
    recorder/
      api.ts
    run/
      api.ts
    security/
      api.ts
    talk/
      api.ts
    workspace/
      api.ts
```

## 4) Nuxt UI First, Custom CSS Only by Exception
Default:
- Prefer Nuxt UI primitives (`UCard`, `UButton`, `UFormField`, `USelect`, etc.) and token-driven variants.

Keep custom CSS when at least one is true:
- Brand/system semantic tokens (`--color-*`, `--ui-*`) used across many features.
- Desktop shell/chrome behavior not covered by Nuxt UI (window chrome, nav shell framing).
- Specialized visualization/perf-driven rendering (waveform styles and animation controls).

Refactor/remove custom CSS when:
- A class only duplicates one-off utility composition.
- A class wraps a single Nuxt UI primitive without semantic reuse.
- A class exists only for legacy migration and has no active call-site value.

## 5) Verification Framework (Coherence + Pragmatic + Simple + SOTA)
### Coherence checks
- Every file in `components/features/domains` appears in the cut map below.
- Every split target has exactly one ownership layer.
- No cut introduces domain -> view/store dependency violations.

### Pragmatic checks
- Splits are required only for files exceeding budget or carrying mixed responsibilities.
- No “framework for future maybe” abstractions without immediate consumer.

### Simplicity checks
- Each new file has a short, explicit purpose sentence.
- Containers orchestrate; presentational files render only.
- Runtime side effects are isolated into lifecycle/runtime modules.

### SOTA Vue 3 checks
- Typed props/emits/composable contracts only.
- No `any` in runtime dependency contracts.
- Computed selectors remain pure; side effects in lifecycle/runtime only.

### Nuxt UI checks
- For each retained custom CSS bucket, a reason is documented in this blueprint.
- New feature UI should default to Nuxt UI primitives unless exception criteria match.

---

## 6) Exhaustive File Cut Map

Legend:
- `keep`: keep file path and responsibility, enforce budget.
- `split`: split into smaller files (new targets listed).
- `move`: move to a more appropriate folder with same behavior.
- `merge`: merge into an existing nearby module.

### 6.1 Components (exhaustive)
- `src/components/AppHeaderMenu.vue` (153) -> `split`: keep `AppHeaderMenu.vue` <=110 + add `app/useAppHeaderMenuActions.ts` <=80.
- `src/components/AudioRecorder.vue` (485) -> `split`: keep container `AudioRecorder.vue` <=180; delegate workflow runtime to `components/recorder/composables/runtime/*` files (listed below).
- `src/components/ConfirmDialog.vue` (62) -> `keep`: cap <=90.
- `src/components/EntityRow.vue` (35) -> `keep`: cap <=70.
- `src/components/PageHeader.vue` (38) -> `keep`: cap <=70.
- `src/components/PageShell.vue` (10) -> `keep`: cap <=40.
- `src/components/SectionPanel.vue` (44) -> `keep`: cap <=80.
- `src/components/SecurityProbe.vue` (122) -> `move`: move under `features/support/components/SecurityProbe.vue` (dev/diagnostics only), keep <=120.
- `src/components/TalkStepPageShell.vue` (26) -> `move`: move to `features/talks/components/TalkStepPageShell.vue`, keep <=70.
- `src/components/TalkStepTabs.vue` (33) -> `move`: move to `features/talks/components/TalkStepTabs.vue`, keep <=80.
- `src/components/WorkspaceSwitcher.vue` (281) -> `split`: `WorkspaceSwitcher.vue` <=160 + `workspace/WorkspaceSwitcherList.vue` <=120 + `workspace/WorkspaceSwitcherCreatePanel.vue` <=120 + `workspace/WorkspaceSwitcherRow.vue` <=120.
- `src/components/workspace/useWorkspaceSwitcher.ts` (123) -> `keep`: cap <=140.
- `src/components/workspace/useWorkspaceSwitcherActions.ts` (373) -> `split`: `useWorkspaceSwitcherActions.ts` <=140 + `useWorkspaceSwitcherCreate.ts` <=120 + `useWorkspaceSwitcherRename.ts` <=120 + `useWorkspaceSwitcherDelete.ts` <=120.
- `src/components/workspace/useWorkspaceSwitcherModel.ts` (142) -> `split`: `useWorkspaceSwitcherModel.ts` <=110 + `workspaceSwitcher.filtering.ts` <=80.
- `src/components/workspace/workspaceSwitcher.refs.ts` (42) -> `move`: move to `components/workspace/refs/workspaceSwitcher.refs.ts`, keep <=60.
- `src/components/shell/RouteContextBar.vue` (17) -> `keep`: cap <=60.
- `src/components/shell/SidebarIconNav.vue` (92) -> `keep`: cap <=120.
- `src/components/shell/TopPrimaryNav.vue` (48) -> `keep`: cap <=90.
- `src/components/shell/WindowChrome.vue` (19) -> `keep`: cap <=70.
- `src/components/recorder/RecorderAdvancedDrawer.vue` (161) -> `split`: keep `RecorderAdvancedDrawer.vue` <=120 + `RecorderAdvancedDrawerTelemetry.vue` <=120.
- `src/components/recorder/RecorderCapturePanel.vue` (96) -> `keep`: cap <=120.
- `src/components/recorder/RecorderExportPanel.vue` (118) -> `keep`: cap <=120.
- `src/components/recorder/RecorderQuickCleanPanel.vue` (405) -> `split`: keep container <=170 + `quick-clean/QuickCleanOnboardingSection.vue` <=120 + `quick-clean/QuickCleanTimelineSection.vue` <=120 + `quick-clean/QuickCleanTranscriptSection.vue` <=120 + `quick-clean/QuickCleanActionBar.vue` <=120.
- `src/components/recorder/RecorderWaveform.vue` (160) -> `split`: keep renderer <=120 + `RecorderWaveformTimelineSvg.vue` <=120.
- `src/components/recorder/composables/audioRecorderCaptureRuntime.ts` (357) -> `split`: `runtime/capture.transport.ts` <=140 + `runtime/capture.devices.ts` <=120 + `runtime/capture.status.ts` <=120 + `runtime/capture.telemetry.ts` <=120 + `runtime/capture.trim.ts` <=100.
- `src/components/recorder/composables/audioRecorderReviewRuntime.ts` (265) -> `split`: `runtime/review.transcribe.ts` <=130 + `runtime/review.editor.ts` <=120 + `runtime/review.export.ts` <=110 + `runtime/review.shortcuts.ts` <=100.
- `src/components/recorder/composables/audioRecorderRuntimeDeps.ts` (109) -> `keep`: cap <=140.
- `src/components/recorder/composables/runtime/audioRecorderCaptureReadiness.ts` (94) -> `move`: merge into `runtime/capture.status.ts` with extracted `capture.readiness.ts` <=80 if growth continues.
- `src/components/recorder/composables/runtime/audioRecorderCaptureTransport.ts` (185) -> `move`: fold into `runtime/capture.transport.ts`; split residual side-effect helpers into `capture.transport.actions.ts` <=100.
- `src/components/recorder/composables/runtime/audioRecorderCaptureUtils.ts` (101) -> `move`: fold into `runtime/capture.status.ts` and `runtime/capture.telemetry.ts`; keep utility fragments <=80 each.
- `src/components/recorder/composables/runtime/audioRecorderReviewActions.ts` (140) -> `move`: merge into `runtime/review.shortcuts.ts` and `runtime/review.export.ts` with action discriminators <=80.
- `src/components/recorder/composables/runtime/audioRecorderReviewTranscription.ts` (136) -> `move`: merge into `runtime/review.transcribe.ts` with extracted transcript hydration helper <=80.
- `src/components/recorder/composables/useAudioRecorderLifecycle.ts` (215) -> `split`: keep orchestrator <=140 + `runtime/registerRecorderListeners.ts` <=140.
- `src/components/recorder/composables/useAudioRecorderPresentation.ts` (227) -> `split`: `useAudioRecorderPresentation.ts` <=140 + `useAudioRecorderCaptureUi.ts` <=120 + `useAudioRecorderReviewUi.ts` <=120.
- `src/components/recorder/composables/useAudioRecorderState.ts` (117) -> `keep`: cap <=140.
- `src/components/recorder/composables/useRecorderQuickCleanPanel.ts` (59) -> `move`: move to `components/recorder/composables/quickClean/useRecorderQuickCleanPanel.ts`, keep <=100.
- `src/components/recorder/composables/quickClean/quickClean.onboarding.ts` (42) -> `keep`: cap <=80.
- `src/components/recorder/composables/quickClean/quickClean.timeline.ts` (246) -> `split`: keep `quickClean.timeline.ts` <=130 + `quickClean.anchorExport.ts` <=100 + `quickClean.seek.ts` <=100.
- `src/components/recorder/composables/quickClean/quickClean.trim.ts` (79) -> `keep`: cap <=90.
- `src/components/recorder/composables/quickClean/quickClean.types.ts` (57) -> `keep`: cap <=80.

### 6.2 Features (exhaustive)
- `src/features/home/pages/HomePage.vue` (497) -> `split`: keep container <=180 + `composables/useHomePageState.ts` <=150 + `composables/useHomePageEffects.ts` <=140.
- `src/features/home/components/HomeQuestAlternatePanel.vue` (92) -> `keep`: cap <=120.
- `src/features/home/components/HomeQuestPickerPanel.vue` (169) -> `split`: keep container <=120 + `HomeQuestPickerFilters.vue` <=110.
- `src/features/home/components/HomeQuestPickerRow.vue` (82) -> `keep`: cap <=100.
- `src/features/home/components/HomeTrainingHeroHighlights.vue` (171) -> `split`: keep <=120 + `HomeTrainingHeroStats.vue` <=110.
- `src/features/home/components/HomeTrainingSidebar.vue` (270) -> `split`: keep container <=150 + `HomeTrainingSidebarRewardsCard.vue` <=120 + `HomeTrainingSidebarQuestMapCard.vue` <=120 + `HomeTrainingSidebarAttemptsCard.vue` <=120.
- `src/features/home/composables/useAchievementPulse.ts` (62) -> `keep`: cap <=90.
- `src/features/home/composables/useHomePresentation.ts` (111) -> `keep`: cap <=130.
- `src/features/home/composables/useHomeQuestSelection.ts` (45) -> `keep`: cap <=80.
- `src/features/home/composables/useHomeTrainingOrchestration.ts` (182) -> `split`: keep <=140 + `useHomeTrainingDataLoader.ts` <=130.
- `src/features/home/composables/useQuestPickerNavigation.ts` (103) -> `keep`: cap <=130.
- `src/features/home/composables/useHomePresentation.test.ts` (55) -> `keep`: cap <=90.
- `src/features/home/composables/useHomeTrainingOrchestration.test.ts` (186) -> `split`: `useHomeTrainingOrchestration.test.ts` <=130 + `useHomeTrainingDataLoader.test.ts` <=120.
- `src/features/home/composables/useQuestPickerNavigation.test.ts` (94) -> `keep`: cap <=120.

- `src/features/feedback/pages/FeedbackPage.vue` (319) -> `split`: keep container <=170 + `components/FeedbackSummaryCard.vue` <=120 + `components/FeedbackActionsCard.vue` <=120 + `composables/useFeedbackPageController.ts` <=150.
- `src/features/feedback/pages/FeedbackTimelinePage.vue` (482) -> `split`: keep container <=180 + `components/FeedbackTimelineFilters.vue` <=120 + `components/FeedbackTimelineList.vue` <=120 + `components/FeedbackTimelineStats.vue` <=120 + `composables/useFeedbackTimelineController.ts` <=160.
- `src/features/feedback/pages/PeerReviewPage.vue` (141) -> `keep`: cap <=170 (already near target).

- `src/features/packs/pages/PacksPage.vue` (231) -> `split`: keep container <=170 + `components/PacksImportExportCard.vue` <=120 + `components/PacksReviewList.vue` <=120 + `composables/usePacksPageController.ts` <=150.

- `src/features/support/pages/AboutPage.vue` (35) -> `keep`: cap <=80.
- `src/features/support/pages/HelpPage.vue` (245) -> `split`: keep container <=170 + `components/HelpQuickstartCard.vue` <=120 + `components/HelpAudiencePlaybookCard.vue` <=120 + `components/HelpDeveloperCard.vue` <=120.
- `src/features/support/pages/OnboardingPage.vue` (173) -> `split`: keep container <=140 + `components/OnboardingAudienceStep.vue` <=120 + `components/OnboardingGoalStep.vue` <=120.
- `src/features/support/pages/SettingsPage.vue` (404) -> `split`: keep container <=170 + `components/settings/SettingsNavigationSection.vue` <=120 + `components/settings/SettingsInsightsSection.vue` <=120 + `components/settings/SettingsVoiceUpSection.vue` <=120 + `components/settings/SettingsTranscriptionSection.vue` <=120.
- `src/features/support/composables/useSettingsPageController.ts` (16) -> `keep`: cap <=60.
- `src/features/support/composables/settings/useSettingsAsrModels.ts` (358) -> `split`: keep orchestration <=150 + `useSettingsAsrDownloadProgress.ts` <=120 + `useSettingsAsrModelActions.ts` <=130 + `useSettingsAsrModelView.ts` <=120.
- `src/features/support/composables/settings/useSettingsInsights.ts` (88) -> `keep`: cap <=120.
- `src/features/support/composables/settings/useSettingsPreferences.ts` (122) -> `keep`: cap <=140.

- `src/features/talks/pages/ProjectSetupPage.vue` (105) -> `keep`: cap <=130.
- `src/features/talks/pages/TalkBuilderPage.vue` (326) -> `split`: keep container <=170 + `components/TalkOutlineEditorCard.vue` <=120 + `components/TalkBuilderActionsCard.vue` <=120 + `composables/useTalkBuilderController.ts` <=150.
- `src/features/talks/pages/TalkDefinePage.vue` (413) -> `split`: keep container <=170 + `components/TalkDefineReadinessCard.vue` <=120 + `components/TalkDefineFormCard.vue` <=120 + `components/TalkDefineStageCard.vue` <=120 + `composables/useTalkDefineController.ts` <=160.
- `src/features/talks/pages/TalkExportPage.vue` (310) -> `split`: keep container <=170 + `components/TalkExportFormatsCard.vue` <=120 + `components/TalkExportHistoryCard.vue` <=120 + `composables/useTalkExportController.ts` <=150.
- `src/features/talks/pages/TalkReportPage.vue` (411) -> `split`: keep container <=170 + `components/TalkReportSummaryCard.vue` <=120 + `components/TalkReportQuestCard.vue` <=120 + `components/TalkReportFeedbackCard.vue` <=120 + `composables/useTalkReportController.ts` <=160.
- `src/features/talks/pages/TalksPage.vue` (363) -> `split`: keep container <=170 + `components/TalksListCard.vue` <=120 + `components/TalksFiltersBar.vue` <=120 + `composables/useTalksPageController.ts` <=160.
- `src/features/talks/pages/TalkTrainPage.vue` (337) -> `split`: keep container <=170 + `components/TalkTrainRecorderCard.vue` <=120 + `components/TalkTrainActionsCard.vue` <=120 + `composables/useTalkTrainController.ts` <=150.

- `src/features/training/pages/BossRunPage.vue` (231) -> `split`: keep container <=170 + `components/BossRunRecorderCard.vue` <=120 + `composables/useBossRunController.ts` <=140.
- `src/features/training/pages/QuestPage.vue` (335) -> `split`: keep container <=170 + `components/QuestBriefCard.vue` <=120 + `components/QuestCaptureCard.vue` <=120 + `components/QuestAnalysisCard.vue` <=120 + `composables/useQuestPageController.ts` <=160.
- `src/features/training/pages/QuickRecordPage.vue` (38) -> `keep`: cap <=80.

- `src/features/workspace/pages/ProfilesPage.vue` (412) -> `split`: keep container <=170 + `components/ProfilesListCard.vue` <=120 + `components/ProfileCreateCard.vue` <=120 + `components/ProfileRow.vue` <=120 + `composables/useProfilesPageController.ts` <=160.

### 6.3 Domains (exhaustive)
- `src/domains/asr/api.ts` (99) -> `keep`: cap <=120; optional split if needed: `asr/api.ts` + `asr/mappers.ts` <=80.
- `src/domains/coach/api.ts` (62) -> `keep`: cap <=100.
- `src/domains/feedback/api.ts` (76) -> `keep`: cap <=100.
- `src/domains/pack/api.ts` (60) -> `keep`: cap <=100.
- `src/domains/quest/api.ts` (95) -> `keep`: cap <=120.
- `src/domains/recorder/api.ts` (89) -> `keep`: cap <=120.
- `src/domains/run/api.ts` (84) -> `keep`: cap <=120.
- `src/domains/security/api.ts` (20) -> `keep`: cap <=80.
- `src/domains/talk/api.ts` (84) -> `keep`: cap <=120.
- `src/domains/workspace/api.ts` (32) -> `keep`: cap <=100.

---

## 7) Coherence / Pragmatic / SOTA Verification Pass (to apply after each cut wave)

### A. Coherence verification
- Dependency graph checks:
- no import from `domains` to `components|features|stores`.
- no direct `invoke` usage outside IPC wrapper boundary.
- Ownership checks:
- every new file tagged as `container`, `presentational`, `controller`, `runtime`, or `api`.
- Size checks:
- file budgets from section 2 must pass for modified files.

### B. Pragmatic + simple verification
- Split ROI check:
- each split removed at least one mixed responsibility.
- No speculative module check:
- no new module without an active caller.
- Low-coupling check:
- presentational components accept props/events only.

### C. Vue 3 SOTA efficiency verification
- Typed composables only:
- no `any` in runtime deps/contracts.
- Side-effect placement:
- only lifecycle/runtime modules bind listeners/timers.
- Reactive hygiene:
- selectors stay pure and computed where possible.
- Async hygiene:
- orchestration actions expose explicit loading/error states.

### D. Nuxt UI + CSS verification
- For every retained custom `app-*` class, document one of:
- semantic token,
- desktop shell behavior,
- performance-critical visualization.
- Replace non-justified legacy wrappers with Nuxt UI composition.
- Keep design guard green.

---

## 8) Implementation Order (recommended)
- Recorder vertical cut (highest risk and most reused).
- Workspace switcher cut.
- Home + feedback page cuts.
- Talks page family cuts.
- Support/settings cuts.
- Training/workspace/packs remaining cuts.
- Final CSS allowlist cleanup under Nuxt UI-first rule.

---

## 9) Acceptance Criteria for Final Architecture
- All files in this map are either kept within budget or split/moved per target.
- No domain boundary violations.
- No runtime `any` contracts.
- High-complexity pages/components reduced to container-only orchestration style.
- Nuxt UI is default for new/updated UI surfaces; retained custom CSS is explicitly justified.
- Existing behavior contracts remain covered by tests; new controllers/runtime modules include targeted tests.
