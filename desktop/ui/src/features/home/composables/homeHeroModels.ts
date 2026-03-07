import { computed, type Ref } from "vue";
import type {
  Quest,
  QuestAttemptSummary,
  QuestDaily,
} from "@/schemas/ipc";

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
