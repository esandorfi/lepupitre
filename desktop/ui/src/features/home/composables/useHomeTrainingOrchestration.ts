import type { ComputedRef, Ref } from "vue";
import { coachStore, trainingStore } from "@/stores/app";
import {
  readStoredHeroQuestCode,
  writeStoredHeroQuestCode,
} from "@/lib/trainingPreferences";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestAttemptSummary,
  QuestDaily,
} from "@/schemas/ipc";
import { evaluateAchievementPulse, type AchievementPulse } from "./useAchievementPulse";
import type { QuestMapNode } from "./useHomePresentation";

type Translate = (key: string) => string;

type HomePickerSort = "recent" | "az" | "category";

type HomeOrchestrationStateRefs = {
  state: ComputedRef<{ activeProfileId: string | null }>;
  locale: Ref<string>;
  showMascotCard: ComputedRef<boolean>;
  questCategories: ComputedRef<string[]>;
  trainingProjectId: Ref<string | null>;
  trainingDailyQuest: Ref<QuestDaily | null>;
  selectedHeroQuest: Ref<Quest | null>;
  recentAttempts: Ref<QuestAttemptSummary[]>;
  trainingProgress: Ref<ProgressSnapshot | null>;
  mascotMessage: Ref<MascotMessage | null>;
  trainingError: Ref<string | null>;
  isTrainingLoading: Ref<boolean>;
  isQuestPickerOpen: Ref<boolean>;
  isQuestPickerLoading: Ref<boolean>;
  questPickerError: Ref<string | null>;
  questPickerSearch: Ref<string>;
  questPickerCategory: Ref<string>;
  questPickerSort: Ref<HomePickerSort>;
  availableQuests: Ref<Quest[]>;
  achievementPulse: Ref<AchievementPulse | null>;
};

type HomeOrchestrationOptions = {
  refs: HomeOrchestrationStateRefs;
  t: Translate;
  toError: (err: unknown) => string;
};

export function useHomeTrainingOrchestration(options: HomeOrchestrationOptions) {
  const {
    state,
    locale,
    showMascotCard,
    questCategories,
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

  async function openQuestPicker() {
    isQuestPickerOpen.value = true;
    if (availableQuests.value.length > 0 || isQuestPickerLoading.value) {
      return;
    }
    isQuestPickerLoading.value = true;
    questPickerError.value = null;
    try {
      availableQuests.value = await trainingStore.getQuestList();
    } catch (err) {
      questPickerError.value = options.toError(err);
    } finally {
      isQuestPickerLoading.value = false;
    }
  }

  async function focusQuestMapNode(node: QuestMapNode) {
    await openQuestPicker();
    if (!isQuestPickerOpen.value) {
      return;
    }
    if (node.category && questCategories.value.includes(node.category)) {
      questPickerCategory.value = node.category;
    } else {
      questPickerCategory.value = "all";
    }
    questPickerSort.value = "category";
    questPickerSearch.value = "";
  }

  return {
    focusQuestMapNode,
    loadTrainingData,
    openQuestPicker,
    preloadQuestCatalog,
  };
}
