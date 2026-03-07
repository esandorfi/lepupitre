import { coachStore, trainingStore } from "@/stores/app";
import {
  readStoredHeroQuestCode,
  writeStoredHeroQuestCode,
} from "@/lib/trainingPreferences";
import { evaluateAchievementPulse } from "@/features/home/composables/useAchievementPulse";
import type { HomeOrchestrationOptions } from "@/features/home/composables/homeTrainingOrchestration.shared";

export function createHomeTrainingDataActions(options: HomeOrchestrationOptions) {
  const {
    state,
    locale,
    showMascotCard,
    trainingProjectId,
    trainingDailyQuest,
    selectedHeroQuest,
    recentAttempts,
    trainingProgress,
    mascotMessage,
    trainingError,
    isTrainingLoading,
    isQuestPickerLoading,
    availableQuests,
    achievementPulse,
  } = options.refs;

  async function preloadQuestCatalog() {
    if (!state.value.activeProfileId) {
      return;
    }
    if (availableQuests.value.length > 0 || isQuestPickerLoading.value) {
      return;
    }
    try {
      availableQuests.value = await trainingStore.getQuestList();
    } catch {
      // non-blocking; quest picker still loads on demand
    }
  }

  async function loadTrainingData() {
    if (!state.value.activeProfileId) {
      trainingProjectId.value = null;
      trainingDailyQuest.value = null;
      selectedHeroQuest.value = null;
      recentAttempts.value = [];
      trainingProgress.value = null;
      mascotMessage.value = null;
      return;
    }
    isTrainingLoading.value = true;
    trainingError.value = null;
    try {
      const projectId = await trainingStore.ensureTrainingProject();
      trainingProjectId.value = projectId;
      trainingDailyQuest.value = await trainingStore.getDailyQuestForProject(projectId);
      if (
        selectedHeroQuest.value &&
        selectedHeroQuest.value.code === trainingDailyQuest.value.quest.code
      ) {
        selectedHeroQuest.value = null;
      }
      const activeProfileId = state.value.activeProfileId;
      if (activeProfileId) {
        const storedQuestCode = readStoredHeroQuestCode(activeProfileId);
        if (storedQuestCode && storedQuestCode !== trainingDailyQuest.value.quest.code) {
          if (selectedHeroQuest.value?.code !== storedQuestCode) {
            try {
              selectedHeroQuest.value = await trainingStore.getQuestByCode(storedQuestCode);
            } catch {
              writeStoredHeroQuestCode(activeProfileId, null);
              selectedHeroQuest.value = null;
            }
          }
        } else if (storedQuestCode === trainingDailyQuest.value.quest.code) {
          writeStoredHeroQuestCode(activeProfileId, null);
        }
      }
      const [attempts, progress, mascot] = await Promise.all([
        trainingStore.getQuestAttempts(projectId, 6),
        coachStore.getProgressSnapshot(projectId),
        showMascotCard.value
          ? coachStore.getMascotContextMessage({
              routeName: "training",
              projectId,
              locale: locale.value,
            })
          : Promise.resolve(null),
      ]);
      recentAttempts.value = attempts;
      trainingProgress.value = progress;
      mascotMessage.value = mascot;
      if (activeProfileId) {
        achievementPulse.value = evaluateAchievementPulse(activeProfileId, progress, options.t);
      }
      void preloadQuestCatalog();
    } catch (err) {
      trainingError.value = options.toError(err);
      trainingDailyQuest.value = null;
      recentAttempts.value = [];
      trainingProgress.value = null;
      mascotMessage.value = null;
      achievementPulse.value = null;
    } finally {
      isTrainingLoading.value = false;
    }
  }

  return {
    preloadQuestCatalog,
    loadTrainingData,
  };
}
