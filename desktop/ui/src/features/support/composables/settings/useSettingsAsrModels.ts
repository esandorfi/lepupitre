import { onBeforeUnmount, onMounted } from "vue";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import {
  asrModelDownload,
  asrModelRemove,
  asrModelsList,
  asrModelVerify,
  asrSidecarStatus,
} from "@/domains/asr/api";
import { classifyAsrError } from "@/lib/asrErrors";
import { hasTauriRuntime } from "@/lib/runtime";
import { AsrModelDownloadProgressEventSchema } from "@/schemas/ipc";
import {
  createAsrModelState,
  createAsrModelView,
  createDownloadProgressQueue,
  formatBytes,
  sidecarMessageForCode,
  type AsrModelState,
} from "@/features/support/composables/settings/useSettingsAsrModelHelpers";

type Translate = (key: string) => string;

function createAsrModelActions(
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

export function useSettingsAsrModels(t: Translate) {
  const state = createAsrModelState();
  const progressQueue = createDownloadProgressQueue(state.downloadProgress);
  const view = createAsrModelView(t, state);
  const actions = createAsrModelActions(t, state, progressQueue);
  let unlistenDownloadProgress: (() => void) | null = null;

  async function openSourceUrl(url: string) {
    try {
      await open(url);
    } catch (err) {
      state.downloadError.value = err instanceof Error ? err.message : String(err);
    }
  }

  onMounted(async () => {
    await actions.refreshModels();
    await actions.refreshSidecarStatus();
    if (!hasTauriRuntime()) {
      return;
    }
    unlistenDownloadProgress = await listen("asr/model_download_progress/v1", (event) => {
      const parsed = AsrModelDownloadProgressEventSchema.safeParse(event.payload);
      if (!parsed.success) {
        return;
      }
      progressQueue.queueDownloadProgress(
        parsed.data.modelId,
        parsed.data.downloadedBytes,
        parsed.data.totalBytes
      );
    });
  });

  onBeforeUnmount(() => {
    progressQueue.clearPendingProgress();
    unlistenDownloadProgress?.();
  });

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
    removeModel: actions.removeModel,
    verifyModel: actions.verifyModel,
    downloadModel: actions.downloadModel,
  };
}
