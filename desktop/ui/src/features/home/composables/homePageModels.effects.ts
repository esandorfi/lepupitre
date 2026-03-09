import { onMounted, watch, type Ref } from "vue";
import type { AchievementPulse } from "@/features/home/composables/useAchievementPulse";
import type { MascotMessage, Quest } from "@/schemas/ipc";
import { appState, coachStore, sessionStore } from "@/stores/app";
import type { QuestSort } from "@/features/home/composables/homePageModels.shared";

/**
 * Binds lifecycle/effect wiring for bind home page effects.
 */
export function bindHomePageEffects(params: {
  state: Readonly<Ref<typeof appState>>;
  availableQuests: Ref<Quest[]>;
  isQuestPickerOpen: Ref<boolean>;
  questPickerSearch: Ref<string>;
  questPickerCategory: Ref<string>;
  questPickerSort: Ref<QuestSort>;
  selectedHeroQuest: Ref<Quest | null>;
  achievementPulse: Ref<AchievementPulse | null>;
  mascotMessage: Ref<MascotMessage | null>;
  uiSettings: Readonly<
    Ref<{ mascotEnabled: boolean; mascotIntensity: string; gamificationMode: string }>
  >;
  locale: Readonly<Ref<string>>;
  showMascotCard: Readonly<Ref<boolean>>;
  trainingProjectId: Ref<string | null>;
  pickerVisibleQuests: Readonly<Ref<Quest[]>>;
  loadTrainingData: () => Promise<void>;
  syncQuestPickerActive: () => void;
}) {
  const {
    state,
    availableQuests,
    isQuestPickerOpen,
    questPickerSearch,
    questPickerCategory,
    questPickerSort,
    selectedHeroQuest,
    achievementPulse,
    mascotMessage,
    uiSettings,
    locale,
    showMascotCard,
    trainingProjectId,
    pickerVisibleQuests,
    loadTrainingData,
    syncQuestPickerActive,
  } = params;

  const refreshMascotMessage = async () => {
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
  };

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

  watch([isQuestPickerOpen, pickerVisibleQuests], () => syncQuestPickerActive(), {
    deep: false,
  });
  watch(
    () => locale.value,
    async () => refreshMascotMessage()
  );

  watch(
    () =>
      [
        uiSettings.value.mascotEnabled,
        uiSettings.value.mascotIntensity,
        uiSettings.value.gamificationMode,
      ] as const,
    async ([mascotEnabled]) => {
      if (!mascotEnabled) {
        mascotMessage.value = null;
        return;
      }
      await refreshMascotMessage();
    }
  );
}
