import { computed, ref, type Ref } from "vue";
import type { AsrModelStatus } from "@/schemas/ipc";

type Translate = (key: string) => string;
export type SidecarStatus = "ready" | "missing" | "incompatible" | "unknown";
export type DownloadProgress = { downloadedBytes: number; totalBytes: number };

export type AsrModelState = {
  models: Ref<AsrModelStatus[]>;
  isLoadingModels: Ref<boolean>;
  downloadingModelId: Ref<string | null>;
  sidecarStatus: Ref<SidecarStatus>;
  sidecarMessage: Ref<string | null>;
  verifyingModelId: Ref<string | null>;
  downloadError: Ref<string | null>;
  downloadProgress: Ref<Record<string, DownloadProgress>>;
};

export function createAsrModelState(): AsrModelState {
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

export function createDownloadProgressQueue(downloadProgress: Ref<Record<string, DownloadProgress>>) {
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

export function formatBytes(value?: number | null) {
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

export function sidecarMessageForCode(code: string | null, t: Translate) {
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

export function createAsrModelView(t: Translate, state: AsrModelState) {
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
