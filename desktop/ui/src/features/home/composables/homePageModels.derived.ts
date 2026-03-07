import { computed, type Ref } from "vue";
import type {
  DailyLoopStep,
  QuestMapNode,
  RewardBadge,
} from "@/features/home/composables/useHomePresentation";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestAttemptSummary,
  QuestDaily,
} from "@/schemas/ipc";
import type { QuestSort } from "@/features/home/composables/homePageModels.shared";

function buildQuestMapState(options: {
  t: (key: string) => string;
  trainingProgress: Ref<ProgressSnapshot | null>;
  questCategoryPool: Ref<string[]>;
  practicedToday: Ref<boolean>;
}) {
  const { t, trainingProgress, questCategoryPool, practicedToday } = options;
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

  return {
    questMapNodes,
    questMapHint,
  };
}

function buildRewardState(options: {
  t: (key: string) => string;
  trainingProgress: Ref<ProgressSnapshot | null>;
}) {
  const { t, trainingProgress } = options;
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

  return {
    rewardBadges,
    unlockedRewardCount,
    nextRewardBadge,
  };
}

export function createHeroState(params: {
  selectedHeroQuest: Ref<Quest | null>;
  trainingDailyQuest: Ref<QuestDaily | null>;
  recentAttempts: Ref<QuestAttemptSummary[]>;
  questRoute: (code: string) => string;
}) {
  const { selectedHeroQuest, trainingDailyQuest, recentAttempts, questRoute } = params;
  const feedbackAttempts = computed(() =>
    recentAttempts.value.filter((attempt) => Boolean(attempt.feedback_id))
  );
  const hasFeedbackInRecent = computed(() =>
    recentAttempts.value.some((attempt) => attempt.has_feedback)
  );
  const heroQuest = computed(
    () => selectedHeroQuest.value ?? trainingDailyQuest.value?.quest ?? null
  );
  const heroQuestIsOverride = computed(() => Boolean(selectedHeroQuest.value));
  const heroQuestRoute = computed(() =>
    heroQuest.value ? questRoute(heroQuest.value.code) : "/training"
  );

  return {
    feedbackAttempts,
    hasFeedbackInRecent,
    heroQuest,
    heroQuestIsOverride,
    heroQuestRoute,
  };
}

export function createQuestPickerState(params: {
  availableQuests: Ref<Quest[]>;
  questPickerSearch: Ref<string>;
  questPickerCategory: Ref<string>;
  questPickerSort: Ref<QuestSort>;
  recentAttempts: Ref<QuestAttemptSummary[]>;
}) {
  const {
    availableQuests,
    questPickerSearch,
    questPickerCategory,
    questPickerSort,
    recentAttempts,
  } = params;

  const questCategories = computed(() => {
    const categories = Array.from(
      new Set(availableQuests.value.map((quest) => quest.category))
    ).sort();
    return ["all", ...categories];
  });
  const filteredQuests = computed(() => {
    const search = questPickerSearch.value.trim().toLowerCase();
    return availableQuests.value.filter((quest) => {
      if (questPickerCategory.value !== "all" && quest.category !== questPickerCategory.value) {
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
      return list.sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.title.localeCompare(b.title) ||
          a.code.localeCompare(b.code)
      );
    }
    return list.sort((a, b) => a.title.localeCompare(b.title) || a.code.localeCompare(b.code));
  });
  const showRecentQuestSection = computed(
    () => questPickerSort.value === "recent" && recentPickerQuests.value.length > 0
  );
  const pickerVisibleQuests = computed(() => [
    ...recentPickerQuests.value,
    ...pickerMainQuests.value,
  ]);

  return {
    questCategories,
    filteredQuests,
    recentPickerQuests,
    pickerMainQuests,
    showRecentQuestSection,
    pickerVisibleQuests,
  };
}

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
