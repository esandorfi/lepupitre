import { computed, type Ref } from "vue";
import { buildDailyLoopState } from "@/features/home/composables/homeDailyLoopModels";
import { buildQuestMapState } from "@/features/home/composables/homeQuestMapModels";
import { buildRewardState } from "@/features/home/composables/homeRewardModels";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestDaily,
} from "@/schemas/ipc";

/**
 * Creates and returns the create gamification state contract.
 */
export function createGamificationState(params: {
  t: (key: string) => string;
  uiSettings: Readonly<
    Ref<{ mascotEnabled: boolean; mascotIntensity: string; gamificationMode: string }>
  >;
  trainingProgress: Ref<ProgressSnapshot | null>;
  availableQuests: Ref<Quest[]>;
  trainingDailyQuest: Ref<QuestDaily | null>;
  mascotMessage: Ref<MascotMessage | null>;
  heroQuest: Readonly<Ref<Quest | null>>;
  questRoute: (code: string) => string;
  hasFeedbackInRecent: Readonly<Ref<boolean>>;
}) {
  const {
    t,
    uiSettings,
    trainingProgress,
    availableQuests,
    trainingDailyQuest,
    mascotMessage,
    heroQuest,
    questRoute,
    hasFeedbackInRecent,
  } = params;

  const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
  const showCredits = computed(() => uiSettings.value.gamificationMode !== "minimal");
  const showQuestMap = computed(() => uiSettings.value.gamificationMode !== "minimal");
  const isQuestWorldMode = computed(() => uiSettings.value.gamificationMode === "quest-world");
  const mascotBody = computed(() => {
    if (!mascotMessage.value || uiSettings.value.mascotIntensity === "minimal") {
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
  const { questMapNodes, questMapHint } = buildQuestMapState({
    t,
    trainingProgress,
    questCategoryPool,
    practicedToday,
  });
  const { rewardBadges, unlockedRewardCount, nextRewardBadge } = buildRewardState({
    t,
    trainingProgress,
  });

  const { dailyLoopSteps, dailyLoopCompletedCount, dailyLoopIsComplete } = buildDailyLoopState({
    t,
    trainingProgress,
    heroQuest,
    questRoute,
    hasFeedbackInRecent,
    practicedToday,
  });

  return {
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
  };
}
