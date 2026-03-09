<script setup lang="ts">
import { reactive } from "vue";
import HomeTrainingHeroHighlights from "../components/HomeTrainingHeroHighlights.vue";
import HomeQuestAlternatePanel from "../components/HomeQuestAlternatePanel.vue";
import HomeTrainingSidebar from "../components/HomeTrainingSidebar.vue";
import { useHomePageState } from "@/features/home/composables/useHomePageState";

/**
 * Page composition root (home training dashboard).
 * Reads: hero/picker/sidebar projections from `useHomePageState`.
 * Actions: quest selection, picker controls, and quest-map focus delegation.
 * Boundary: page composes feature panels and forwards view-model bindings.
 */
const vm = reactive(useHomePageState());
</script>
<template>
  <section class="app-page-shell">
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)] xl:items-start">
      <div class="space-y-4">
        <HomeTrainingHeroHighlights
          :training-error="vm.trainingError"
          :is-training-loading="vm.isTrainingLoading"
          :hero-quest="vm.heroQuest"
          :hero-quest-is-override="vm.heroQuestIsOverride"
          :training-daily-quest="vm.trainingDailyQuest"
          :hero-quest-route="vm.heroQuestRoute"
          :achievement-pulse="vm.achievementPulse"
          :show-mascot-card="vm.showMascotCard"
          :mascot-message="vm.mascotMessage"
          :mascot-body="vm.mascotBody"
          :training-progress="vm.trainingProgress"
          :daily-loop-steps="vm.dailyLoopSteps"
          :daily-loop-completed-count="vm.dailyLoopCompletedCount"
          :daily-loop-is-complete="vm.dailyLoopIsComplete"
          @reset-hero-quest-to-daily="vm.resetHeroQuestToDaily"
          @dismiss-achievement="vm.achievementPulse = null"
        />
        <HomeQuestAlternatePanel
          :training-project-id="vm.trainingProjectId"
          :is-quest-picker-open="vm.isQuestPickerOpen"
          :is-quest-picker-loading="vm.isQuestPickerLoading"
          :quest-picker-error="vm.questPickerError"
          :quest-picker-search="vm.questPickerSearch"
          :quest-picker-category="vm.questPickerCategory"
          :quest-picker-sort="vm.questPickerSort"
          :quest-categories="vm.questCategories"
          :has-filtered-quests="vm.filteredQuests.length > 0"
          :show-recent-quest-section="vm.showRecentQuestSection"
          :recent-picker-quests="vm.recentPickerQuests"
          :picker-main-quests="vm.pickerMainQuests"
          :selected-hero-quest-code="vm.heroQuest?.code ?? null"
          :quest-picker-active-code="vm.questPickerActiveCode"
          :quest-code-label="vm.questCodeLabel"
          :output-label="vm.outputLabel"
          :estimated-minutes-label="vm.estimatedMinutesLabel"
          @open-quest-picker="vm.openQuestPicker"
          @update:search="vm.questPickerSearch = $event"
          @update:category="vm.questPickerCategory = $event"
          @update:sort="vm.questPickerSort = $event"
          @close="vm.closeQuestPicker"
          @select-quest="vm.selectHeroQuest"
          @keydown="vm.onQuestPickerKeydown"
        />
      </div>
      <HomeTrainingSidebar
        :is-training-loading="vm.isTrainingLoading"
        :training-progress="vm.trainingProgress"
        :show-credits="vm.showCredits"
        :show-quest-map="vm.showQuestMap"
        :is-quest-world-mode="vm.isQuestWorldMode"
        :weekly-progress-percent="vm.weeklyProgressPercent"
        :credits-to-milestone="vm.creditsToMilestone"
        :quest-map-nodes="vm.questMapNodes"
        :quest-map-hint="vm.questMapHint"
        :reward-badges="vm.rewardBadges"
        :unlocked-reward-count="vm.unlockedRewardCount"
        :next-reward-badge="vm.nextRewardBadge"
        :feedback-attempts="vm.feedbackAttempts"
        :recent-attempts="vm.recentAttempts"
        :training-project-id="vm.trainingProjectId"
        :quest-code-label="vm.questCodeLabel"
        @focus-quest-map-node="vm.focusQuestMapNode"
      />
    </div>
  </section>
</template>
