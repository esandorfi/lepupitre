import { computed, type Ref } from "vue";
import type { RewardBadge } from "@/features/home/composables/useHomePresentation";
import type { ProgressSnapshot } from "@/schemas/ipc";

/**
 * Builds the build reward state derived model.
 */
export function buildRewardState(options: {
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
