import {
  createAsrModelState,
  createAsrModelView,
  formatBytes,
} from "@/features/support/composables/settings/useSettingsAsrModelHelpers";
import { useAsrModelRuntime } from "@/features/support/composables/settings/settingsAsrModelRuntime";

type Translate = (key: string) => string;

export function useSettingsAsrModels(t: Translate) {
  const state = createAsrModelState();
  const view = createAsrModelView(t, state);
  const { openSourceUrl, removeModel, verifyModel, downloadModel } = useAsrModelRuntime(t, state);

  return {
    ...view,
    formatBytes,
    openSourceUrl,
    sidecarMessage: state.sidecarMessage,
    isLoadingModels: state.isLoadingModels,
    downloadError: state.downloadError,
    downloadProgress: state.downloadProgress,
    downloadingModelId: state.downloadingModelId,
    verifyingModelId: state.verifyingModelId,
    removeModel,
    verifyModel,
    downloadModel,
  };
}
