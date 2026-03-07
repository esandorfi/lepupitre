import { open } from "@tauri-apps/plugin-shell";
import {
  createDownloadProgressQueue,
  type AsrModelState,
} from "@/features/support/composables/settings/useSettingsAsrModelHelpers";
import { createAsrModelActions } from "@/features/support/composables/settings/settingsAsrModelActions";
import { bindAsrModelLifecycle } from "@/features/support/composables/settings/settingsAsrModelLifecycle";

type Translate = (key: string) => string;

type AsrModelRuntimeDeps = {
  openUrl: (url: string) => Promise<void>;
};

function createDefaultAsrModelRuntimeDeps(): AsrModelRuntimeDeps {
  return {
    openUrl: (url) => open(url),
  };
}

type AsrModelRuntimeArgs = {
  t: Translate;
  state: AsrModelState;
  deps?: AsrModelRuntimeDeps;
};

export function useAsrModelRuntime(args: AsrModelRuntimeArgs) {
  const deps = args.deps ?? createDefaultAsrModelRuntimeDeps();
  const { t, state } = args;
  const progressQueue = createDownloadProgressQueue(state.downloadProgress);
  const actions = createAsrModelActions({
    t,
    state,
    progressQueue,
  });

  async function openSourceUrl(url: string) {
    try {
      await deps.openUrl(url);
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
