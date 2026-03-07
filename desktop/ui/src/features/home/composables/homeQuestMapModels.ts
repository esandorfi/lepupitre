import { computed, type Ref } from "vue";
import type { QuestMapNode } from "@/features/home/composables/useHomePresentation";
import type { ProgressSnapshot } from "@/schemas/ipc";

export function buildQuestMapState(options: {
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
