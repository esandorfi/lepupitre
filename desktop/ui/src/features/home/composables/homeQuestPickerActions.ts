import { trainingStore } from "@/stores/app";
import type {
  FocusQuestMapNode,
  HomeOrchestrationStateRefs,
} from "@/features/home/composables/homeTrainingOrchestration.shared";

type HomeQuestPickerActionOptions = {
  refs: HomeOrchestrationStateRefs;
  toError: (err: unknown) => string;
};

/**
 * Creates and returns the create home quest picker actions contract.
 */
export function createHomeQuestPickerActions(options: HomeQuestPickerActionOptions) {
  const {
    state,
    questCategories,
    isQuestPickerOpen,
    isQuestPickerLoading,
    questPickerError,
    questPickerSearch,
    questPickerCategory,
    questPickerSort,
    availableQuests,
  } = options.refs;

  async function openQuestPicker() {
    isQuestPickerOpen.value = true;
    if (availableQuests.value.length > 0 || isQuestPickerLoading.value) {
      return;
    }
    isQuestPickerLoading.value = true;
    questPickerError.value = null;
    try {
      if (!state.value.activeProfileId) {
        return;
      }
      availableQuests.value = await trainingStore.getQuestList();
    } catch (err) {
      questPickerError.value = options.toError(err);
    } finally {
      isQuestPickerLoading.value = false;
    }
  }

  const focusQuestMapNode: FocusQuestMapNode = async (node) => {
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
  };

  return {
    openQuestPicker,
    focusQuestMapNode,
  };
}
