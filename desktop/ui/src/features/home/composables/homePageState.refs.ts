import { ref } from "vue";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestAttemptSummary,
  QuestDaily,
} from "@/schemas/ipc";
import type { AchievementPulse } from "@/features/home/composables/useAchievementPulse";
import type { QuestSort } from "@/features/home/composables/homePageModels.shared";

/**
 * Creates and returns the create home page state refs contract.
 */
export function createHomePageStateRefs() {
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
  const questPickerSort = ref<QuestSort>("recent");
  const availableQuests = ref<Quest[]>([]);
  const achievementPulse = ref<AchievementPulse | null>(null);

  return {
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
  };
}
