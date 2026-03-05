import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import {
  asrModelDownload,
  asrModelRemove,
  asrModelsList,
  asrModelVerify,
  asrSidecarStatus,
} from "@/domains/asr/api";
import { useI18n } from "@/lib/i18n";
import { classifyAsrError } from "@/lib/asrErrors";
import { useNavMetrics } from "@/lib/navMetrics";
import { useRecorderHealthMetrics } from "@/lib/recorderHealthMetrics";
import { useTranscriptionSettings } from "@/lib/transcriptionSettings";
import type {
  GamificationMode,
  MascotIntensity,
  PrimaryNavMode,
} from "@/lib/uiPreferences";
import { useUiPreferences } from "@/lib/uiPreferences";
import { hasTauriRuntime } from "@/lib/runtime";
import {
  AsrModelDownloadProgressEventSchema,
  AsrModelStatus,
} from "@/schemas/ipc";

export function useSettingsPageController() {
  const { t } = useI18n();
  const { settings, updateSettings } = useTranscriptionSettings();
  const {
    settings: uiSettings,
    setPrimaryNavMode,
    setGamificationMode,
    setMascotEnabled,
    setMascotIntensity,
  } = useUiPreferences();
  const { metrics: navMetrics, resetNavMetrics } = useNavMetrics();
  const { metrics: recorderHealthMetrics, resetRecorderHealthMetrics } = useRecorderHealthMetrics();

  const models = ref<AsrModelStatus[]>([]);
  const isLoadingModels = ref(false);
  const downloadingModelId = ref<string | null>(null);
  const sidecarStatus = ref<"ready" | "missing" | "incompatible" | "unknown">("unknown");
  const sidecarMessage = ref<string | null>(null);

  const verifyingModelId = ref<string | null>(null);
  const downloadError = ref<string | null>(null);
  const downloadProgress = ref<Record<string, { downloadedBytes: number; totalBytes: number }>>(
    {}
  );
  const DOWNLOAD_PROGRESS_UI_FLUSH_MS = 80;

  let unlistenDownloadProgress: (() => void) | null = null;
  let downloadProgressFlushTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingDownloadProgress: Record<
    string,
    { downloadedBytes: number; totalBytes: number }
  > = {};

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

  const modelOptions = computed(() =>
    models.value.map((model) => {
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

  const modeOptions = computed(() => [
    { value: "auto", label: t("settings.transcription.mode_auto") },
    { value: "live+final", label: t("settings.transcription.mode_live_final") },
    { value: "final-only", label: t("settings.transcription.mode_final_only") },
  ]);
  const navModeOptions = computed(() => [
    { value: "top", label: t("settings.navigation.mode_top") },
    { value: "sidebar-icon", label: t("settings.navigation.mode_sidebar") },
  ]);
  const gamificationModeOptions = computed(() => [
    { value: "minimal", label: t("settings.voiceup.gamification_minimal") },
    { value: "balanced", label: t("settings.voiceup.gamification_balanced") },
    { value: "quest-world", label: t("settings.voiceup.gamification_quest_world") },
  ]);
  const mascotIntensityOptions = computed(() => [
    { value: "minimal", label: t("settings.voiceup.mascot_minimal") },
    { value: "contextual", label: t("settings.voiceup.mascot_contextual") },
  ]);

  const sidecarBadgeTone = computed<"error" | "neutral" | "success">(() => {
    if (sidecarStatus.value === "ready") {
      return "success";
    }
    if (sidecarStatus.value === "missing" || sidecarStatus.value === "incompatible") {
      return "error";
    }
    return "neutral";
  });

  const sidecarStatusLabel = computed(() => {
    if (sidecarStatus.value === "ready") {
      return t("settings.transcription.sidecar_ready");
    }
    if (sidecarStatus.value === "missing") {
      return t("settings.transcription.sidecar_missing_label");
    }
    if (sidecarStatus.value === "incompatible") {
      return t("settings.transcription.sidecar_incompatible_label");
    }
    return t("settings.transcription.sidecar_unknown_label");
  });

  const spokenPunctuationEnabled = computed({
    get: () => settings.value.spokenPunctuation,
    set: (value: boolean) => {
      updateSettings({ spokenPunctuation: value });
    },
  });

  const languageOptions = computed(() => [
    { value: "auto", label: t("settings.transcription.language_auto") },
    { value: "en", label: t("settings.transcription.language_en") },
    { value: "fr", label: t("settings.transcription.language_fr") },
  ]);

  const selectedModel = computed({
    get: () => settings.value.model,
    set: (value: string) => {
      const model = modelOptions.value.find((option) => option.id === value);
      if (!model || !model.installed) {
        return;
      }
      updateSettings({ model: model.id as "tiny" | "base" });
    },
  });

  const selectedMode = computed({
    get: () => settings.value.mode,
    set: (value: string) => {
      updateSettings({ mode: value as "auto" | "live+final" | "final-only" });
    },
  });

  const selectedLanguage = computed({
    get: () => settings.value.language,
    set: (value: string) => {
      updateSettings({ language: value as "auto" | "en" | "fr" });
    },
  });

  const selectedNavMode = computed({
    get: () => uiSettings.value.primaryNavMode,
    set: (value: string) => {
      if (value === "top" || value === "sidebar-icon") {
        setPrimaryNavMode(value as PrimaryNavMode);
      }
    },
  });
  const selectedGamificationMode = computed({
    get: () => uiSettings.value.gamificationMode,
    set: (value: string) => {
      if (value === "minimal" || value === "balanced" || value === "quest-world") {
        setGamificationMode(value as GamificationMode);
      }
    },
  });
  const mascotEnabled = computed({
    get: () => uiSettings.value.mascotEnabled,
    set: (value: boolean) => {
      setMascotEnabled(value);
    },
  });
  const selectedMascotIntensity = computed({
    get: () => uiSettings.value.mascotIntensity,
    set: (value: string) => {
      if (value === "minimal" || value === "contextual") {
        setMascotIntensity(value as MascotIntensity);
      }
    },
  });

  const averageNavLatencyMs = computed(() => Math.round(navMetrics.value.avgLatencyMs));
  const recorderStartAttempts = computed(
    () => recorderHealthMetrics.value.startSuccessCount + recorderHealthMetrics.value.startFailureCount
  );
  const recorderStartSuccessRate = computed(() => {
    if (recorderStartAttempts.value <= 0) {
      return 0;
    }
    return Math.round(
      (recorderHealthMetrics.value.startSuccessCount / recorderStartAttempts.value) * 100
    );
  });
  const transcribeAttempts = computed(
    () =>
      recorderHealthMetrics.value.transcribeSuccessCount +
      recorderHealthMetrics.value.transcribeFailureCount
  );
  const transcribeSuccessRate = computed(() => {
    if (transcribeAttempts.value <= 0) {
      return 0;
    }
    return Math.round(
      (recorderHealthMetrics.value.transcribeSuccessCount / transcribeAttempts.value) * 100
    );
  });
  const topRecorderHealthErrors = computed(() =>
    Object.entries(recorderHealthMetrics.value.errorsByCode)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
  );

  function formatUtcDayLabel(dayKey: string): string {
    const parsed = new Date(`${dayKey}T00:00:00.000Z`);
    if (Number.isNaN(parsed.valueOf())) {
      return dayKey;
    }
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    }).format(parsed);
  }

  const recorderHealthDailyRows = computed(() => {
    const rows: Array<{
      key: string;
      label: string;
      startSuccessCount: number;
      stopFailureCount: number;
      transcribeFailureCount: number;
      trimFailureCount: number;
    }> = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      day.setUTCDate(day.getUTCDate() - offset);
      const key = day.toISOString().slice(0, 10);
      const daily = recorderHealthMetrics.value.daily[key];
      rows.push({
        key,
        label: formatUtcDayLabel(key),
        startSuccessCount: daily?.startSuccessCount ?? 0,
        stopFailureCount: daily?.stopFailureCount ?? 0,
        transcribeFailureCount: daily?.transcribeFailureCount ?? 0,
        trimFailureCount: daily?.trimFailureCount ?? 0,
      });
    }
    return rows;
  });

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

  async function refreshSidecarStatus() {
    try {
      await asrSidecarStatus();
      sidecarStatus.value = "ready";
      sidecarMessage.value = null;
    } catch (err) {
      const code = classifyAsrError(err instanceof Error ? err.message : String(err));
      if (code === "sidecar_missing") {
        sidecarStatus.value = "missing";
        sidecarMessage.value = t("settings.transcription.sidecar_missing");
      } else if (code === "sidecar_incompatible") {
        sidecarStatus.value = "incompatible";
        sidecarMessage.value = t("settings.transcription.sidecar_incompatible");
      } else {
        sidecarStatus.value = "unknown";
        sidecarMessage.value = t("settings.transcription.sidecar_unknown");
      }
    }
  }

  function shortHash(value: string) {
    return value.slice(0, 8);
  }

  async function openSourceUrl(url: string) {
    try {
      await open(url);
    } catch (err) {
      downloadError.value = err instanceof Error ? err.message : String(err);
    }
  }

  function progressPercent(modelId: string) {
    const progress = downloadProgress.value[modelId];
    if (!progress || progress.totalBytes <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100));
  }

  function progressLabel(modelId: string) {
    const progress = downloadProgress.value[modelId];
    if (!progress) {
      return "";
    }
    if (progress.totalBytes > 0) {
      return `${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)}`;
    }
    return formatBytes(progress.downloadedBytes);
  }

  async function refreshModels() {
    isLoadingModels.value = true;
    downloadError.value = null;
    try {
      models.value = await asrModelsList();
    } catch (err) {
      downloadError.value = err instanceof Error ? err.message : String(err);
    } finally {
      isLoadingModels.value = false;
    }
  }

  async function removeModel(modelId: string) {
    const confirmed = window.confirm(t("settings.transcription.model_remove_confirm"));
    if (!confirmed) {
      return;
    }
    downloadError.value = null;
    try {
      await asrModelRemove(modelId);
      await refreshModels();
      await refreshSidecarStatus();
    } catch (err) {
      downloadError.value = err instanceof Error ? err.message : String(err);
    }
  }

  async function verifyModel(modelId: string) {
    if (downloadingModelId.value || verifyingModelId.value) {
      return;
    }
    verifyingModelId.value = modelId;
    downloadError.value = null;
    try {
      await asrModelVerify(modelId);
      await refreshModels();
      await refreshSidecarStatus();
    } catch (err) {
      downloadError.value = err instanceof Error ? err.message : String(err);
    } finally {
      verifyingModelId.value = null;
    }
  }

  async function downloadModel(modelId: string) {
    if (downloadingModelId.value || verifyingModelId.value) {
      return;
    }
    downloadingModelId.value = modelId;
    downloadError.value = null;
    downloadProgress.value = {
      ...downloadProgress.value,
      [modelId]: { downloadedBytes: 0, totalBytes: 0 },
    };

    try {
      await asrModelDownload(modelId);
      await refreshModels();
      await refreshSidecarStatus();
    } catch (err) {
      downloadError.value = err instanceof Error ? err.message : String(err);
    } finally {
      downloadingModelId.value = null;
      delete pendingDownloadProgress[modelId];
      const next = { ...downloadProgress.value };
      delete next[modelId];
      downloadProgress.value = next;
    }
  }

  onMounted(async () => {
    await refreshModels();
    await refreshSidecarStatus();
    if (!hasTauriRuntime()) {
      return;
    }
    unlistenDownloadProgress = await listen("asr/model_download_progress/v1", (event) => {
      const parsed = AsrModelDownloadProgressEventSchema.safeParse(event.payload);
      if (!parsed.success) {
        return;
      }
      queueDownloadProgress(parsed.data.modelId, parsed.data.downloadedBytes, parsed.data.totalBytes);
    });
  });

  onBeforeUnmount(() => {
    if (downloadProgressFlushTimer !== null) {
      clearTimeout(downloadProgressFlushTimer);
      downloadProgressFlushTimer = null;
    }
    for (const key of Object.keys(pendingDownloadProgress)) {
      delete pendingDownloadProgress[key];
    }
    unlistenDownloadProgress?.();
  });

  return {
    t,
    navMetrics,
    resetNavMetrics,
    recorderHealthMetrics,
    resetRecorderHealthMetrics,
    modelOptions,
    modelSelectOptions,
    modeOptions,
    navModeOptions,
    gamificationModeOptions,
    mascotIntensityOptions,
    sidecarBadgeTone,
    sidecarStatusLabel,
    sidecarMessage,
    spokenPunctuationEnabled,
    languageOptions,
    selectedModel,
    selectedMode,
    selectedLanguage,
    selectedNavMode,
    selectedGamificationMode,
    mascotEnabled,
    selectedMascotIntensity,
    averageNavLatencyMs,
    recorderStartSuccessRate,
    transcribeSuccessRate,
    topRecorderHealthErrors,
    recorderHealthDailyRows,
    formatBytes,
    shortHash,
    openSourceUrl,
    progressPercent,
    progressLabel,
    isLoadingModels,
    downloadError,
    downloadProgress,
    downloadingModelId,
    verifyingModelId,
    removeModel,
    verifyModel,
    downloadModel,
  };
}
