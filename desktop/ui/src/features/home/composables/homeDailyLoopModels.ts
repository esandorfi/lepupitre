import { computed, type Ref } from "vue";
import type { DailyLoopStep } from "@/features/home/composables/useHomePresentation";
import type { ProgressSnapshot, Quest } from "@/schemas/ipc";

export function buildDailyLoopState(options: {
  t: (key: string) => string;
  trainingProgress: Ref<ProgressSnapshot | null>;
  heroQuest: Readonly<Ref<Quest | null>>;
  questRoute: (code: string) => string;
  hasFeedbackInRecent: Readonly<Ref<boolean>>;
  practicedToday: Ref<boolean>;
}) {
  const { t, trainingProgress, heroQuest, questRoute, hasFeedbackInRecent, practicedToday } =
    options;

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
    dailyLoopSteps,
    dailyLoopCompletedCount,
    dailyLoopIsComplete,
  };
}
