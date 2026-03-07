import { createHomeTrainingDataActions } from "@/features/home/composables/homeTrainingDataActions";
import { createHomeQuestPickerActions } from "@/features/home/composables/homeQuestPickerActions";
import type { HomeOrchestrationOptions } from "@/features/home/composables/homeTrainingOrchestration.shared";

export function useHomeTrainingOrchestration(options: HomeOrchestrationOptions) {
  const { preloadQuestCatalog, loadTrainingData } = createHomeTrainingDataActions(options);
  const { openQuestPicker, focusQuestMapNode } = createHomeQuestPickerActions({
    refs: options.refs,
    toError: options.toError,
  });

  return {
    focusQuestMapNode,
    loadTrainingData,
    openQuestPicker,
    preloadQuestCatalog,
  };
}
