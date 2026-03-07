<script setup lang="ts">
import HomeTrainingHeroHighlights from "../components/HomeTrainingHeroHighlights.vue";
import HomeQuestAlternatePanel from "../components/HomeQuestAlternatePanel.vue";
import HomeTrainingSidebar from "../components/HomeTrainingSidebar.vue";
import { useHomePageState } from "@/features/home/composables/useHomePageState";

const {
  estimatedMinutesLabel,
  outputLabel,
  trainingProjectId,
  trainingDailyQuest,
  recentAttempts,
  trainingProgress,
  mascotMessage,
  trainingError,
  isTrainingLoading,
  isQuestPickerOpen,
  isQuestPickerLoading,
  questPickerError,
  questPickerSearch,
  questPickerCategory,
  questPickerSort,
  achievementPulse,
  feedbackAttempts,
  heroQuest,
  heroQuestIsOverride,
  heroQuestRoute,
  questCategories,
  filteredQuests,
  recentPickerQuests,
  pickerMainQuests,
  showRecentQuestSection,
  showMascotCard,
  showCredits,
  showQuestMap,
  isQuestWorldMode,
  mascotBody,
  weeklyProgressPercent,
  creditsToMilestone,
  questMapNodes,
  questMapHint,
  rewardBadges,
  unlockedRewardCount,
  nextRewardBadge,
  dailyLoopSteps,
  dailyLoopCompletedCount,
  dailyLoopIsComplete,
  questCodeLabel,
  closeQuestPicker,
  selectHeroQuest,
  resetHeroQuestToDaily,
  questPickerActiveCode,
  onQuestPickerKeydown,
  focusQuestMapNode,
  openQuestPicker,
} = useHomePageState();
</script>
<template>
  <section class="app-page-shell">
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)] xl:items-start">
      <div class="space-y-4">
        <HomeTrainingHeroHighlights
          :training-error="trainingError"
          :is-training-loading="isTrainingLoading"
          :hero-quest="heroQuest"
          :hero-quest-is-override="heroQuestIsOverride"
          :training-daily-quest="trainingDailyQuest"
          :hero-quest-route="heroQuestRoute"
          :achievement-pulse="achievementPulse"
          :show-mascot-card="showMascotCard"
          :mascot-message="mascotMessage"
          :mascot-body="mascotBody"
          :training-progress="trainingProgress"
          :daily-loop-steps="dailyLoopSteps"
          :daily-loop-completed-count="dailyLoopCompletedCount"
          :daily-loop-is-complete="dailyLoopIsComplete"
          @reset-hero-quest-to-daily="resetHeroQuestToDaily"
          @dismiss-achievement="achievementPulse = null"
        />
        <HomeQuestAlternatePanel
          :training-project-id="trainingProjectId"
          :is-quest-picker-open="isQuestPickerOpen"
          :is-quest-picker-loading="isQuestPickerLoading"
          :quest-picker-error="questPickerError"
          :quest-picker-search="questPickerSearch"
          :quest-picker-category="questPickerCategory"
          :quest-picker-sort="questPickerSort"
          :quest-categories="questCategories"
          :has-filtered-quests="filteredQuests.length > 0"
          :show-recent-quest-section="showRecentQuestSection"
          :recent-picker-quests="recentPickerQuests"
          :picker-main-quests="pickerMainQuests"
          :selected-hero-quest-code="heroQuest?.code ?? null"
          :quest-picker-active-code="questPickerActiveCode"
          :quest-code-label="questCodeLabel"
          :output-label="outputLabel"
          :estimated-minutes-label="estimatedMinutesLabel"
          @open-quest-picker="openQuestPicker"
          @update:search="questPickerSearch = $event"
          @update:category="questPickerCategory = $event"
          @update:sort="questPickerSort = $event"
          @close="closeQuestPicker"
          @select-quest="selectHeroQuest"
          @keydown="onQuestPickerKeydown"
        />
      </div>
      <HomeTrainingSidebar
        :is-training-loading="isTrainingLoading"
        :training-progress="trainingProgress"
        :show-credits="showCredits"
        :show-quest-map="showQuestMap"
        :is-quest-world-mode="isQuestWorldMode"
        :weekly-progress-percent="weeklyProgressPercent"
        :credits-to-milestone="creditsToMilestone"
        :quest-map-nodes="questMapNodes"
        :quest-map-hint="questMapHint"
        :reward-badges="rewardBadges"
        :unlocked-reward-count="unlockedRewardCount"
        :next-reward-badge="nextRewardBadge"
        :feedback-attempts="feedbackAttempts"
        :recent-attempts="recentAttempts"
        :training-project-id="trainingProjectId"
        :quest-code-label="questCodeLabel"
        @focus-quest-map-node="focusQuestMapNode"
      />
    </div>
  </section>
</template>
