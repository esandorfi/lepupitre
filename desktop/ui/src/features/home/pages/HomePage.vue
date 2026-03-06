<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import HomeTrainingHeroHighlights from "../components/HomeTrainingHeroHighlights.vue";
import HomeQuestAlternatePanel from "../components/HomeQuestAlternatePanel.vue";
import HomeTrainingSidebar from "../components/HomeTrainingSidebar.vue";
import { useHomeQuestSelection } from "@/features/home/composables/useHomeQuestSelection";
import { useI18n } from "@/lib/i18n";
import {
  writeStoredHeroQuestCode,
} from "@/lib/trainingPreferences";
import { useUiPreferences } from "@/lib/uiPreferences";
import { appState, coachStore, sessionStore, trainingStore } from "@/stores/app";
import type { AchievementPulse } from "../composables/useAchievementPulse";
import {
  useHomePresentation,
  type DailyLoopStep,
  type QuestMapNode,
  type RewardBadge,
} from "../composables/useHomePresentation";
import { useHomeTrainingOrchestration } from "../composables/useHomeTrainingOrchestration";
import { useQuestPickerNavigation } from "../composables/useQuestPickerNavigation";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestAttemptSummary,
  QuestDaily,
} from "@/schemas/ipc";
const { t, locale } = useI18n();
const {
  estimatedMinutesLabel,
  outputLabel,
  toError,
} = useHomePresentation(t);
const { settings: uiSettings } = useUiPreferences();
const state = computed(() => appState);
const trainingProjectId = ref<string | null>(null);
const trainingDailyQuest = ref<QuestDaily | null>(null);
const selectedHeroQuest = ref<Quest | null>(null);
const recentAttempts = ref<QuestAttemptSummary[]>([]);
const trainingProgress = ref<ProgressSnapshot | null>(null);
const mascotMessage = ref<MascotMessage | null>(null);
const trainingError = ref<string | null>(null);
const isTrainingLoading = ref(false);
const isQuestPickerOpen = ref(false);
const isQuestPickerLoading = ref(false);
const questPickerError = ref<string | null>(null);
const questPickerSearch = ref("");
const questPickerCategory = ref("all");
const questPickerSort = ref<"recent" | "az" | "category">("recent");
const availableQuests = ref<Quest[]>([]);
const achievementPulse = ref<AchievementPulse | null>(null);
const feedbackAttempts = computed(() =>
  recentAttempts.value.filter((attempt) => Boolean(attempt.feedback_id))
);
const hasFeedbackInRecent = computed(() =>
  recentAttempts.value.some((attempt) => attempt.has_feedback)
);
const heroQuest = computed(() => selectedHeroQuest.value ?? trainingDailyQuest.value?.quest ?? null);
const heroQuestIsOverride = computed(() => Boolean(selectedHeroQuest.value));
const heroQuestRoute = computed(() =>
  heroQuest.value ? questRoute(heroQuest.value.code) : "/training"
);
const questCategories = computed(() => {
  const categories = Array.from(
    new Set(availableQuests.value.map((quest) => quest.category))
  ).sort();
  return ["all", ...categories];
});
const filteredQuests = computed(() => {
  const search = questPickerSearch.value.trim().toLowerCase();
  return availableQuests.value.filter((quest) => {
    if (
      questPickerCategory.value !== "all" &&
      quest.category !== questPickerCategory.value
    ) {
      return false;
    }
    if (!search) {
      return true;
    }
    return (
      quest.code.toLowerCase().includes(search) ||
      quest.title.toLowerCase().includes(search) ||
      quest.prompt.toLowerCase().includes(search)
    );
  });
});
const recentQuestCodes = computed(() => {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const attempt of recentAttempts.value) {
    if (!seen.has(attempt.quest_code)) {
      seen.add(attempt.quest_code);
      codes.push(attempt.quest_code);
    }
  }
  return codes;
});
const recentQuestIndex = computed(() => {
  const map = new Map<string, number>();
  recentQuestCodes.value.forEach((code, index) => map.set(code, index));
  return map;
});
const recentPickerQuests = computed(() => {
  const recentSet = new Set(recentQuestCodes.value);
  return filteredQuests.value
    .filter((quest) => recentSet.has(quest.code))
    .sort((a, b) => {
      const aIndex = recentQuestIndex.value.get(a.code) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = recentQuestIndex.value.get(b.code) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
});
const pickerMainQuests = computed(() => {
  let list = filteredQuests.value.slice();
  if (questPickerSort.value === "recent" && recentPickerQuests.value.length > 0) {
    const recentSet = new Set(recentPickerQuests.value.map((quest) => quest.code));
    list = list.filter((quest) => !recentSet.has(quest.code));
  }
  if (questPickerSort.value === "category") {
    return list.sort((a, b) =>
      a.category.localeCompare(b.category) ||
      a.title.localeCompare(b.title) ||
      a.code.localeCompare(b.code)
    );
  }
  return list.sort((a, b) =>
    a.title.localeCompare(b.title) || a.code.localeCompare(b.code)
  );
});
const showRecentQuestSection = computed(
  () => questPickerSort.value === "recent" && recentPickerQuests.value.length > 0
);
const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
const showCredits = computed(() => uiSettings.value.gamificationMode !== "minimal");
const showQuestMap = computed(() => uiSettings.value.gamificationMode !== "minimal");
const isQuestWorldMode = computed(() => uiSettings.value.gamificationMode === "quest-world");
const mascotBody = computed(() => {
  if (!mascotMessage.value) {
    return "";
  }
  if (uiSettings.value.mascotIntensity === "minimal") {
    return "";
  }
  return mascotMessage.value.body;
});
const weeklyProgressPercent = computed(() => {
  const progress = trainingProgress.value;
  if (!progress || progress.weekly_target <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((progress.weekly_completed / progress.weekly_target) * 100));
});
const creditsToMilestone = computed(() => {
  const progress = trainingProgress.value;
  if (!progress) {
    return 0;
  }
  return Math.max(0, progress.next_milestone - progress.credits);
});
const questCategoryPool = computed(() => {
  const categories = Array.from(
    new Set(
      availableQuests.value
        .map((quest) => quest.category.trim())
        .filter((category) => category.length > 0)
    )
  ).sort();
  const dailyCategory = trainingDailyQuest.value?.quest.category?.trim();
  if (!dailyCategory) {
    return categories;
  }
  const withoutDaily = categories.filter((category) => category !== dailyCategory);
  return [dailyCategory, ...withoutDaily];
});
const practicedToday = computed(() => {
  const value = trainingProgress.value?.last_attempt_at;
  if (!value) {
    return false;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const today = new Date();
  return parsed.toDateString() === today.toDateString();
});
const questMapNodes = computed<QuestMapNode[]>(() => {
  const progress = trainingProgress.value;
  if (!progress) {
    return [];
  }
  const checkpoints = Math.max(3, Math.min(7, progress.weekly_target));
  const completed = Math.min(progress.weekly_completed, checkpoints);
  return Array.from({ length: checkpoints }, (_, index) => {
    const order = index + 1;
    const isDone = order <= completed;
    const isCurrent = !isDone && order === completed + 1;
    const category =
      questCategoryPool.value.length > 0
        ? questCategoryPool.value[index % questCategoryPool.value.length]
        : null;
    return {
      id: `weekly-${order}`,
      label: `${t("training.quest_map_checkpoint")} ${order}`,
      reward: order === checkpoints ? 20 : 10,
      category,
      done: isDone,
      current: isCurrent,
      offsetPx: order % 2 === 0 ? 14 : 0,
    };
  });
});
const questMapHint = computed(() => {
  const progress = trainingProgress.value;
  if (!progress) {
    return t("training.quest_map_empty");
  }
  if (progress.weekly_completed >= progress.weekly_target) {
    return t("training.quest_map_hint_complete");
  }
  if (practicedToday.value) {
    return t("training.quest_map_hint_today");
  }
  if (progress.weekly_completed === 0) {
    return t("training.quest_map_hint_start");
  }
  return t("training.quest_map_hint_continue");
});
const rewardBadges = computed<RewardBadge[]>(() => {
  const progress = trainingProgress.value;
  if (!progress) {
    return [];
  }
  const weeklyTarget = Math.max(1, progress.weekly_target);
  return [
    {
      id: "streak-3",
      title: t("training.reward_streak_3"),
      unlocked: progress.streak_days >= 3,
      current: progress.streak_days,
      target: 3,
    },
    {
      id: "credits-100",
      title: t("training.reward_credits_100"),
      unlocked: progress.credits >= 100,
      current: progress.credits,
      target: 100,
    },
    {
      id: "weekly-target",
      title: `${t("training.reward_weekly_habit")} ${weeklyTarget}`,
      unlocked: progress.weekly_completed >= weeklyTarget,
      current: progress.weekly_completed,
      target: weeklyTarget,
    },
    {
      id: "streak-7",
      title: t("training.reward_streak_7"),
      unlocked: progress.streak_days >= 7,
      current: progress.streak_days,
      target: 7,
    },
  ];
});
const unlockedRewardCount = computed(
  () => rewardBadges.value.filter((badge) => badge.unlocked).length
);
const nextRewardBadge = computed(
  () => rewardBadges.value.find((badge) => !badge.unlocked) ?? null
);
const dailyLoopSteps = computed<DailyLoopStep[]>(() => {
  const practiceRoute = heroQuest.value ? questRoute(heroQuest.value.code) : "/training";
  return [
    {
      id: "practice",
      title: t("training.daily_loop_step_practice"),
      done: practicedToday.value,
      ctaRoute: practiceRoute,
    },
    {
      id: "feedback",
      title: t("training.daily_loop_step_feedback"),
      done: hasFeedbackInRecent.value,
      ctaRoute: "/feedback",
    },
    {
      id: "momentum",
      title: t("training.daily_loop_step_momentum"),
      done: (trainingProgress.value?.streak_days ?? 0) >= 3,
      ctaRoute: "/training",
    },
  ];
});
const dailyLoopCompletedCount = computed(
  () => dailyLoopSteps.value.filter((step) => step.done).length
);
const dailyLoopIsComplete = computed(
  () => dailyLoopCompletedCount.value >= dailyLoopSteps.value.length
);
const pickerVisibleQuests = computed(() => [
  ...recentPickerQuests.value,
  ...pickerMainQuests.value,
]);
const {
  questCodeLabel,
  questRoute,
  closeQuestPicker,
  selectHeroQuest,
  resetHeroQuestToDaily,
} = useHomeQuestSelection({
  trainingProjectId,
  selectedHeroQuest,
  isQuestPickerOpen,
  activeProfileId: computed(() => state.value.activeProfileId),
  writeStoredHeroQuestCode,
  formatQuestCode: trainingStore.formatQuestCode,
});
const {
  activeCode: questPickerActiveCode,
  onKeydown: onQuestPickerKeydown,
  syncActive: syncQuestPickerActive,
} = useQuestPickerNavigation({
  isOpen: isQuestPickerOpen,
  isLoading: isQuestPickerLoading,
  error: questPickerError,
  visibleItems: pickerVisibleQuests,
  preferredCode: computed(() => heroQuest.value?.code ?? null),
  onClose: closeQuestPicker,
  onSelect: selectHeroQuest,
});
const {
  focusQuestMapNode,
  loadTrainingData,
  openQuestPicker,
} = useHomeTrainingOrchestration({
  refs: {
    state,
    locale,
    showMascotCard,
    questCategories,
    trainingProjectId,
    trainingDailyQuest,
    selectedHeroQuest,
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
    availableQuests,
    achievementPulse,
  },
  t,
  toError,
});
onMounted(async () => {
  await sessionStore.bootstrap();
  await loadTrainingData();
});
watch(
  () => state.value.activeProfileId,
  async () => {
    availableQuests.value = [];
    isQuestPickerOpen.value = false;
    questPickerSearch.value = "";
    questPickerCategory.value = "all";
    questPickerSort.value = "recent";
    selectedHeroQuest.value = null;
    achievementPulse.value = null;
    await loadTrainingData();
  }
);
watch(
  [isQuestPickerOpen, pickerVisibleQuests],
  () => {
    syncQuestPickerActive();
  },
  { deep: false }
);
watch(
  () => locale.value,
  async () => {
    if (!showMascotCard.value || !trainingProjectId.value || !state.value.activeProfileId) {
      return;
    }
    try {
      mascotMessage.value = await coachStore.getMascotContextMessage({
        routeName: "training",
        projectId: trainingProjectId.value,
        locale: locale.value,
      });
    } catch {
      // non-blocking assistant copy
    }
  }
);
watch(
  () => [uiSettings.value.mascotEnabled, uiSettings.value.mascotIntensity, uiSettings.value.gamificationMode] as const,
  async ([mascotEnabled]) => {
    if (!mascotEnabled) {
      mascotMessage.value = null;
      return;
    }
    if (!trainingProjectId.value || !state.value.activeProfileId) {
      return;
    }
    try {
      mascotMessage.value = await coachStore.getMascotContextMessage({
        routeName: "training",
        projectId: trainingProjectId.value,
        locale: locale.value,
      });
    } catch {
      // non-blocking assistant copy
    }
  }
);
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
