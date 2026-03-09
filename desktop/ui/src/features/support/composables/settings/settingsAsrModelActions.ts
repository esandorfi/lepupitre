import {
  asrModelDownload,
  asrModelRemove,
  asrModelsList,
  asrModelVerify,
  asrSidecarStatus,
} from "@/domains/asr/api";
import { classifyAsrError } from "@/lib/asrErrors";
import {
  createDownloadProgressQueue,
  sidecarMessageForCode,
  type AsrModelState,
} from "@/features/support/composables/settings/useSettingsAsrModelHelpers";

type Translate = (key: string) => string;

type AsrModelActionsDeps = {
  asrSidecarStatus: () => Promise<unknown>;
  asrModelsList: () => Promise<AsrModelState["models"]["value"]>;
  asrModelRemove: (modelId: string) => Promise<unknown>;
  asrModelVerify: (modelId: string) => Promise<unknown>;
  asrModelDownload: (modelId: string) => Promise<unknown>;
  classifyAsrError: (message: string) => string | null;
  sidecarMessageForCode: typeof sidecarMessageForCode;
  confirm: (message: string) => boolean;
};

function createDefaultAsrModelActionsDeps(): AsrModelActionsDeps {
  return {
    asrSidecarStatus,
    asrModelsList,
    asrModelRemove,
    asrModelVerify,
    asrModelDownload,
    classifyAsrError,
    sidecarMessageForCode,
    confirm: (message) => window.confirm(message),
  };
}

type AsrModelActionsArgs = {
  t: Translate;
  state: AsrModelState;
  progressQueue: ReturnType<typeof createDownloadProgressQueue>;
  deps?: AsrModelActionsDeps;
};

/**
 * Creates and returns the create asr model actions contract.
 */
export function createAsrModelActions(args: AsrModelActionsArgs) {
  const deps = args.deps ?? createDefaultAsrModelActionsDeps();
  const { t, state, progressQueue } = args;

  async function refreshSidecarStatus() {
    try {
      await deps.asrSidecarStatus();
      state.sidecarStatus.value = "ready";
      state.sidecarMessage.value = null;
    } catch (err) {
      const code = deps.classifyAsrError(err instanceof Error ? err.message : String(err));
      const next = deps.sidecarMessageForCode(code, t);
      state.sidecarStatus.value = next.status;
      state.sidecarMessage.value = next.message;
    }
  }

  async function refreshModels() {
    state.isLoadingModels.value = true;
    state.downloadError.value = null;
    try {
      state.models.value = await deps.asrModelsList();
    } catch (err) {
      state.downloadError.value = err instanceof Error ? err.message : String(err);
    } finally {
      state.isLoadingModels.value = false;
    }
  }

  async function removeModel(modelId: string) {
    const confirmed = deps.confirm(t("settings.transcription.model_remove_confirm"));
    if (!confirmed) {
      return;
    }
    state.downloadError.value = null;
    try {
      await deps.asrModelRemove(modelId);
      await refreshModels();
      await refreshSidecarStatus();
    } catch (err) {
      state.downloadError.value = err instanceof Error ? err.message : String(err);
    }
  }

  async function verifyModel(modelId: string) {
    if (state.downloadingModelId.value || state.verifyingModelId.value) {
      return;
    }
    state.verifyingModelId.value = modelId;
    state.downloadError.value = null;
    try {
      await deps.asrModelVerify(modelId);
      await refreshModels();
      await refreshSidecarStatus();
    } catch (err) {
      state.downloadError.value = err instanceof Error ? err.message : String(err);
    } finally {
      state.verifyingModelId.value = null;
    }
  }

  async function downloadModel(modelId: string) {
    if (state.downloadingModelId.value || state.verifyingModelId.value) {
      return;
    }
    state.downloadingModelId.value = modelId;
    state.downloadError.value = null;
    state.downloadProgress.value = {
      ...state.downloadProgress.value,
      [modelId]: { downloadedBytes: 0, totalBytes: 0 },
    };
    try {
      await deps.asrModelDownload(modelId);
      await refreshModels();
      await refreshSidecarStatus();
    } catch (err) {
      state.downloadError.value = err instanceof Error ? err.message : String(err);
    } finally {
      state.downloadingModelId.value = null;
      progressQueue.clearModelProgress(modelId);
    }
  }

  return {
    refreshModels,
    refreshSidecarStatus,
    removeModel,
    verifyModel,
    downloadModel,
  };
}
