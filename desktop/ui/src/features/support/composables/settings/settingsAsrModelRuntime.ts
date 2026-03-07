import { open } from "@tauri-apps/plugin-shell";
import {
  createDownloadProgressQueue,
  type AsrModelState,
} from "@/features/support/composables/settings/useSettingsAsrModelHelpers";
import { createAsrModelActions } from "@/features/support/composables/settings/settingsAsrModelActions";
import { bindAsrModelLifecycle } from "@/features/support/composables/settings/settingsAsrModelLifecycle";

type Translate = (key: string) => string;

export function useAsrModelRuntime(t: Translate, state: AsrModelState) {
  const progressQueue = createDownloadProgressQueue(state.downloadProgress);
  const actions = createAsrModelActions(t, state, progressQueue);

  async function openSourceUrl(url: string) {
    try {
      await open(url);
    } catch (err) {
      state.downloadError.value = err instanceof Error ? err.message : String(err);
    }
  }

  bindAsrModelLifecycle(
    progressQueue,
    actions.refreshModels,
    actions.refreshSidecarStatus
  );

  return {
    openSourceUrl,
    removeModel: actions.removeModel,
    verifyModel: actions.verifyModel,
    downloadModel: actions.downloadModel,
  };
}
