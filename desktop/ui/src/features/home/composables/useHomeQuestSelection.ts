import type { ComputedRef, Ref } from "vue";
import type { Quest } from "@/schemas/ipc";

type Dependencies = {
  trainingProjectId: Ref<string | null>;
  selectedHeroQuest: Ref<Quest | null>;
  isQuestPickerOpen: Ref<boolean>;
  activeProfileId: ComputedRef<string | null>;
  writeStoredHeroQuestCode: (profileId: string, questCode: string | null) => void;
  formatQuestCode: (projectId: string, code: string) => string;
};

export function useHomeQuestSelection(dependencies: Dependencies) {
  function questCodeLabel(code: string) {
    const projectId = dependencies.trainingProjectId.value ?? "";
    return dependencies.formatQuestCode(projectId, code);
  }

  function questRoute(code: string) {
    if (!dependencies.trainingProjectId.value) {
      return "/training";
    }
    return `/quest/${code}?projectId=${dependencies.trainingProjectId.value}&from=training`;
  }

  function closeQuestPicker() {
    dependencies.isQuestPickerOpen.value = false;
  }

  function selectHeroQuest(quest: Quest) {
    dependencies.selectedHeroQuest.value = quest;
    if (dependencies.activeProfileId.value) {
      dependencies.writeStoredHeroQuestCode(dependencies.activeProfileId.value, quest.code);
    }
    closeQuestPicker();
  }

  function resetHeroQuestToDaily() {
    dependencies.selectedHeroQuest.value = null;
    if (dependencies.activeProfileId.value) {
      dependencies.writeStoredHeroQuestCode(dependencies.activeProfileId.value, null);
    }
  }

  return {
    questCodeLabel,
    questRoute,
    closeQuestPicker,
    selectHeroQuest,
    resetHeroQuestToDaily,
  };
}
