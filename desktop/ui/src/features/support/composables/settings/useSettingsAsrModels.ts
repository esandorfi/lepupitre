import { computed, onBeforeUnmount, onMounted, ref, type Ref } from "vue";
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
import {
  AsrModelDownloadProgressEventSchema,
  type AsrModelStatus,
} from "@/schemas/ipc";

type Translate = (key: string) => string;
type SidecarStatus = "ready" | "missing" | "incompatible" | "unknown";
type DownloadProgress = { downloadedBytes: number; totalBytes: number };

type AsrModelState = {
  models: Ref<AsrModelStatus[]>;
  isLoadingModels: Ref<boolean>;
  downloadingModelId: Ref<string | null>;
  sidecarStatus: Ref<SidecarStatus>;
  sidecarMessage: Ref<string | null>;
  verifyingModelId: Ref<string | null>;
  downloadError: Ref<string | null>;
  downloadProgress: Ref<Record<string, DownloadProgress>>;
};

function createDownloadProgressQueue(downloadProgress: Ref<Record<string, DownloadProgress>>) {
  const DOWNLOAD_PROGRESS_UI_FLUSH_MS = 80;
  let downloadProgressFlushTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingDownloadProgress: Record<string, DownloadProgress> = {};

  function flushPendingDownloadProgress() {
    const updates = Object.entries(pendingDownloadProgress);
    if (updates.length === 0) {
      return;
    }
    const next = { ...downloadProgress.value };
    let changed = false;
    for (const [modelId, progress] of updates) {
      delete pendingDownloadProgress[modelId];
      const current = next[modelId];
      if (
        current &&
        current.downloadedBytes === progress.downloadedBytes &&
        current.totalBytes === progress.totalBytes
      ) {
        continue;
      }
      next[modelId] = progress;
      changed = true;
    }
    if (changed) {
      downloadProgress.value = next;
    }
  }

  function queueDownloadProgress(modelId: string, downloadedBytes: number, totalBytes: number) {
    pendingDownloadProgress[modelId] = { downloadedBytes, totalBytes };
    if (downloadProgressFlushTimer !== null) {
      return;
    }
    downloadProgressFlushTimer = setTimeout(() => {
      downloadProgressFlushTimer = null;
      flushPendingDownloadProgress();
    }, DOWNLOAD_PROGRESS_UI_FLUSH_MS);
  }

  function clearPendingProgress() {
    if (downloadProgressFlushTimer !== null) {
      clearTimeout(downloadProgressFlushTimer);
      downloadProgressFlushTimer = null;
    }
    for (const key of Object.keys(pendingDownloadProgress)) {
      delete pendingDownloadProgress[key];
    }
  }

  function clearModelProgress(modelId: string) {
    delete pendingDownloadProgress[modelId];
    const next = { ...downloadProgress.value };
    delete next[modelId];
    downloadProgress.value = next;
  }

  return {
    queueDownloadProgress,
    clearPendingProgress,
    clearModelProgress,
  };
}

function formatBytes(value?: number | null) {
  if (!value || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function sidecarMessageForCode(code: string | null, t: Translate) {
  if (code === "sidecar_missing") {
    return {
      status: "missing" as const,
      message: t("settings.transcription.sidecar_missing"),
    };
  }
  if (code === "sidecar_incompatible") {
    return {
      status: "incompatible" as const,
      message: t("settings.transcription.sidecar_incompatible"),
    };
  }
  return {
    status: "unknown" as const,
    message: t("settings.transcription.sidecar_unknown"),
  };
}

function createAsrModelState(): AsrModelState {
  return {
    models: ref<AsrModelStatus[]>([]),
    isLoadingModels: ref(false),
    downloadingModelId: ref<string | null>(null),
    sidecarStatus: ref<SidecarStatus>("unknown"),
    sidecarMessage: ref<string | null>(null),
    verifyingModelId: ref<string | null>(null),
    downloadError: ref<string | null>(null),
    downloadProgress: ref<Record<string, DownloadProgress>>({}),
  };
}

function createAsrModelView(t: Translate, state: AsrModelState) {
  const modelOptions = computed(() =>
    state.models.value.map((model) => {
      const label =
        model.id === "tiny"
          ? t("settings.transcription.model_tiny")
          : t("settings.transcription.model_base");
      let statusKey = "settings.transcription.model_status_missing";
      if (model.checksum_ok === false) {
        statusKey = "settings.transcription.model_status_invalid";
      } else if (model.installed && model.checksum_ok == null) {
        statusKey = "settings.transcription.model_status_unverified";
      } else if (model.installed) {
        statusKey = "settings.transcription.model_status_ready";
      } else if (model.bundled) {
        statusKey = "settings.transcription.model_status_missing_bundled";
      }
      return {
        id: model.id,
        label,
        installed: model.installed,
        expectedBytes: model.expected_bytes,
        checksum: model.expected_sha256,
        sourceUrl: model.source_url,
        checksumOk: model.checksum_ok,
        status: t(statusKey),
      };
    })
  );

  const modelSelectOptions = computed(() =>
    modelOptions.value.map((option) => ({
      value: option.id,
      label: `${option.label} - ${option.status}`,
      disabled: !option.installed,
    }))
  );

  const sidecarBadgeTone = computed<"error" | "neutral" | "success">(() => {
    if (state.sidecarStatus.value === "ready") {
      return "success";
    }
    if (
      state.sidecarStatus.value === "missing" ||
      state.sidecarStatus.value === "incompatible"
    ) {
      return "error";
    }
    return "neutral";
  });

  const sidecarStatusLabel = computed(() => {
    if (state.sidecarStatus.value === "ready") {
      return t("settings.transcription.sidecar_ready");
    }
    if (state.sidecarStatus.value === "missing") {
      return t("settings.transcription.sidecar_missing_label");
    }
    if (state.sidecarStatus.value === "incompatible") {
      return t("settings.transcription.sidecar_incompatible_label");
    }
    return t("settings.transcription.sidecar_unknown_label");
  });

  function shortHash(value: string) {
    return value.slice(0, 8);
  }

  function progressPercent(modelId: string) {
    const progress = state.downloadProgress.value[modelId];
    if (!progress || progress.totalBytes <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100));
  }

  function progressLabel(modelId: string) {
    const progress = state.downloadProgress.value[modelId];
    if (!progress) {
      return "";
    }
    if (progress.totalBytes > 0) {
      return `${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)}`;
    }
    return formatBytes(progress.downloadedBytes);
  }

  return {
    modelOptions,
    modelSelectOptions,
    sidecarBadgeTone,
    sidecarStatusLabel,
    shortHash,
    progressPercent,
    progressLabel,
  };
}

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
