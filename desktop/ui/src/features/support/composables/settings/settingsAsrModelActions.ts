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

export function createAsrModelActions(
  t: Translate,
  state: AsrModelState,
  progressQueue: ReturnType<typeof createDownloadProgressQueue>
) {
  async function refreshSidecarStatus() {
    try {
      await asrSidecarStatus();
      state.sidecarStatus.value = "ready";
      state.sidecarMessage.value = null;
    } catch (err) {
      const code = classifyAsrError(err instanceof Error ? err.message : String(err));
      const next = sidecarMessageForCode(code, t);
      state.sidecarStatus.value = next.status;
      state.sidecarMessage.value = next.message;
    }
  }

  async function refreshModels() {
    state.isLoadingModels.value = true;
    state.downloadError.value = null;
    try {
      state.models.value = await asrModelsList();
    } catch (err) {
      state.downloadError.value = err instanceof Error ? err.message : String(err);
    } finally {
      state.isLoadingModels.value = false;
    }
  }

  async function removeModel(modelId: string) {
    const confirmed = window.confirm(t("settings.transcription.model_remove_confirm"));
    if (!confirmed) {
      return;
    }
    state.downloadError.value = null;
    try {
      await asrModelRemove(modelId);
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
      await asrModelVerify(modelId);
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
      await asrModelDownload(modelId);
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
