<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import {
  asrModelDownload,
  asrModelRemove,
  asrModelsList,
  asrModelVerify,
  asrSidecarStatus,
} from "../../../domains/asr/api";
import { useI18n } from "../../../lib/i18n";
import { classifyAsrError } from "../../../lib/asrErrors";
import { useNavMetrics } from "../../../lib/navMetrics";
import { useRecorderHealthMetrics } from "../../../lib/recorderHealthMetrics";
import { useTranscriptionSettings } from "../../../lib/transcriptionSettings";
import type {
  GamificationMode,
  MascotIntensity,
  PrimaryNavMode,
} from "../../../lib/uiPreferences";
import { useUiPreferences } from "../../../lib/uiPreferences";
import { hasTauriRuntime } from "../../../lib/runtime";
import {
  AsrModelDownloadProgressEventSchema,
  AsrModelStatus,
} from "../../../schemas/ipc";

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
const downloadProgress = ref<Record<string, { downloadedBytes: number; totalBytes: number }>>({});
const DOWNLOAD_PROGRESS_UI_FLUSH_MS = 80;

let unlistenDownloadProgress: (() => void) | null = null;
let downloadProgressFlushTimer: ReturnType<typeof setTimeout> | null = null;
const pendingDownloadProgress: Record<string, { downloadedBytes: number; totalBytes: number }> =
  {};

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
  return Math.round((recorderHealthMetrics.value.startSuccessCount / recorderStartAttempts.value) * 100);
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
  return Math.round((recorderHealthMetrics.value.transcribeSuccessCount / transcribeAttempts.value) * 100);
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
  downloadProgress.value = { ...downloadProgress.value, [modelId]: { downloadedBytes: 0, totalBytes: 0 } };

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
    queueDownloadProgress(
      parsed.data.modelId,
      parsed.data.downloadedBytes,
      parsed.data.totalBytes
    );
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
</script>

<template>
  <section class="space-y-4">
    <UCard class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="app-nav-text text-lg font-semibold">
            {{ t("settings.navigation.title") }}
          </h2>
          <p class="app-muted text-xs">
            {{ t("settings.navigation.subtitle") }}
          </p>
        </div>
        <div class="app-muted text-xs">
          {{ t("settings.navigation.scope") }}
        </div>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <UFormField
          :label="t('settings.navigation.mode_label')"
          :help="t('settings.navigation.mode_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedNavMode"
            class="w-full"
            :items="navModeOptions"
            value-key="value"
          />
        </UFormField>

        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-nav-text text-sm font-semibold">
            {{ t("settings.navigation.metrics_title") }}
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div class="app-muted">{{ t("settings.navigation.metrics_switch_count") }}</div>
            <div class="text-right font-semibold">{{ navMetrics.switchCount }}</div>
            <div class="app-muted">{{ t("settings.navigation.metrics_avg_latency") }}</div>
            <div class="text-right font-semibold">{{ averageNavLatencyMs }} ms</div>
            <div class="app-muted">{{ t("settings.navigation.metrics_top_switch") }}</div>
            <div class="text-right font-semibold">{{ navMetrics.topSwitchCount }}</div>
            <div class="app-muted">{{ t("settings.navigation.metrics_sidebar_switch") }}</div>
            <div class="text-right font-semibold">{{ navMetrics.sidebarSwitchCount }}</div>
            <div class="app-muted">{{ t("settings.navigation.metrics_sidebar_sessions") }}</div>
            <div class="text-right font-semibold">{{ navMetrics.sidebarSessionCount }}</div>
          </div>
          <div class="mt-3 flex justify-end">
            <UButton size="sm" color="neutral" variant="outline" @click="resetNavMetrics">
              {{ t("settings.navigation.metrics_reset") }}
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <UCard class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="app-nav-text text-lg font-semibold">
            {{ t("settings.insights.health_title") }}
          </h2>
          <p class="app-muted text-xs">
            {{ t("settings.insights.health_subtitle") }}
          </p>
        </div>
        <div class="app-muted text-xs">
          {{ t("settings.insights.health_scope") }}
        </div>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_recordings_started") }}</div>
          <div class="app-nav-text mt-1 text-xl font-semibold">{{ recorderHealthMetrics.startSuccessCount }}</div>
        </div>
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_start_success_rate") }}</div>
          <div class="app-nav-text mt-1 text-xl font-semibold">{{ recorderStartSuccessRate }}%</div>
        </div>
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_stop_failures") }}</div>
          <div class="app-nav-text mt-1 text-xl font-semibold">{{ recorderHealthMetrics.stopFailureCount }}</div>
        </div>
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_transcribe_success_rate") }}</div>
          <div class="app-nav-text mt-1 text-xl font-semibold">{{ transcribeSuccessRate }}%</div>
        </div>
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_trim_failures") }}</div>
          <div class="app-nav-text mt-1 text-xl font-semibold">{{ recorderHealthMetrics.trimFailureCount }}</div>
        </div>
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_last_error") }}</div>
          <div class="app-nav-text mt-1 text-sm font-semibold break-all">
            {{ recorderHealthMetrics.lastErrorCode ?? t("settings.insights.health_none") }}
          </div>
        </div>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-nav-text text-sm font-semibold">
            {{ t("settings.insights.health_daily_title") }}
          </div>
          <div class="mt-2 grid grid-cols-[70px_repeat(4,minmax(0,1fr))] gap-2 text-xs">
            <div class="app-muted">{{ t("settings.insights.health_day") }}</div>
            <div class="app-muted text-right">{{ t("settings.insights.health_daily_recordings") }}</div>
            <div class="app-muted text-right">{{ t("settings.insights.health_daily_stop_fail") }}</div>
            <div class="app-muted text-right">{{ t("settings.insights.health_daily_transcribe_fail") }}</div>
            <div class="app-muted text-right">{{ t("settings.insights.health_daily_trim_fail") }}</div>
            <template v-for="row in recorderHealthDailyRows" :key="row.key">
              <div class="app-text">{{ row.label }}</div>
              <div class="app-text text-right font-semibold">{{ row.startSuccessCount }}</div>
              <div class="app-text text-right font-semibold">{{ row.stopFailureCount }}</div>
              <div class="app-text text-right font-semibold">{{ row.transcribeFailureCount }}</div>
              <div class="app-text text-right font-semibold">{{ row.trimFailureCount }}</div>
            </template>
          </div>
        </div>

        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-nav-text text-sm font-semibold">
            {{ t("settings.insights.health_top_errors_title") }}
          </div>
          <div v-if="topRecorderHealthErrors.length === 0" class="app-muted mt-2 text-xs">
            {{ t("settings.insights.health_none") }}
          </div>
          <div v-else class="mt-2 space-y-2">
            <div
              v-for="[code, count] in topRecorderHealthErrors"
              :key="code"
              class="flex items-center justify-between gap-2 text-xs"
            >
              <span class="app-text break-all">{{ code }}</span>
              <span class="app-text font-semibold">{{ count }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-3 flex justify-end">
        <UButton size="sm" color="neutral" variant="outline" @click="resetRecorderHealthMetrics">
          {{ t("settings.insights.health_reset") }}
        </UButton>
      </div>
    </UCard>

    <UCard class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="app-nav-text text-lg font-semibold">
            {{ t("settings.voiceup.title") }}
          </h2>
          <p class="app-muted text-xs">
            {{ t("settings.voiceup.subtitle") }}
          </p>
        </div>
        <div class="app-muted text-xs">
          {{ t("settings.voiceup.scope") }}
        </div>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <UFormField
          :label="t('settings.voiceup.gamification_label')"
          :help="t('settings.voiceup.gamification_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedGamificationMode"
            class="w-full"
            :items="gamificationModeOptions"
            value-key="value"
          />
        </UFormField>

        <UFormField
          :label="t('settings.voiceup.mascot_enabled_label')"
          :help="t('settings.voiceup.mascot_note')"
          class="app-nav-text text-xs"
        >
          <USwitch
            v-model="mascotEnabled"
            :label="mascotEnabled ? t('settings.voiceup.mascot_on') : t('settings.voiceup.mascot_off')"
            size="md"
          />
        </UFormField>

        <UFormField
          :label="t('settings.voiceup.mascot_intensity_label')"
          :help="t('settings.voiceup.mascot_intensity_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedMascotIntensity"
            class="w-full"
            :disabled="!mascotEnabled"
            :items="mascotIntensityOptions"
            value-key="value"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="app-nav-text text-lg font-semibold">
            {{ t("settings.transcription.title") }}
          </h2>
          <div class="mt-1 flex items-center gap-2 text-xs">
            <span class="app-muted">{{ t("settings.transcription.sidecar_label") }}</span>
            <UBadge :color="sidecarBadgeTone" variant="solid">
              {{ sidecarStatusLabel }}
            </UBadge>
          </div>
          <p class="app-muted text-xs">
            {{ t("settings.transcription.subtitle") }}
          </p>
          <p v-if="sidecarMessage" class="app-danger-text text-xs">{{ sidecarMessage }}</p>
        </div>
        <div class="app-muted text-xs">
          {{ t("settings.transcription.scope") }}
        </div>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <UFormField
          :label="t('settings.transcription.model_label')"
          :help="t('settings.transcription.model_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedModel"
            class="w-full"
            :items="modelSelectOptions"
            value-key="value"
          />
        </UFormField>

        <UFormField
          :label="t('settings.transcription.mode_label')"
          :help="t('settings.transcription.mode_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedMode"
            class="w-full"
            :items="modeOptions"
            value-key="value"
          />
        </UFormField>

        <UFormField
          :label="t('settings.transcription.language_label')"
          :help="t('settings.transcription.language_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedLanguage"
            class="w-full"
            :items="languageOptions"
            value-key="value"
          />
        </UFormField>
        <UFormField
          :label="t('settings.transcription.spoken_punctuation_label')"
          :help="t('settings.transcription.spoken_punctuation_note')"
          class="app-nav-text text-xs"
        >
          <USwitch
            v-model="spokenPunctuationEnabled"
            :label="spokenPunctuationEnabled
              ? t('settings.transcription.spoken_punctuation_on')
              : t('settings.transcription.spoken_punctuation_off')"
            size="md"
          />
          <p class="app-muted text-xs">
            {{ t("settings.transcription.spoken_punctuation_help") }}
          </p>
        </UFormField>
      </div>

      <div class="mt-4 space-y-2">
        <div v-if="isLoadingModels" class="app-muted text-xs">
          {{ t("settings.transcription.model_loading") }}
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="model in modelOptions"
            :key="model.id"
            class="app-surface rounded-xl border px-3 py-3"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1">
                <div class="app-nav-text text-sm font-semibold">{{ model.label }}</div>
                <div class="app-muted text-xs">{{ model.status }}</div>
                <div class="app-muted text-xs">
                  {{ t("settings.transcription.model_size") }}: {{ formatBytes(model.expectedBytes) }}
                </div>
                <div class="app-muted text-xs">
                  {{ t("settings.transcription.model_hash") }}: {{ shortHash(model.checksum) }}
                </div>
              </div>
              <div class="flex flex-col items-end gap-2">
                <div class="app-muted text-xs">
                  {{ t("settings.transcription.model_source") }}:
                  <UButton
                    class="app-link max-w-[320px] justify-start truncate text-left !px-0 !py-0 !font-normal"
                    size="sm"
                   
                    color="neutral"
                   variant="ghost" @click="openSourceUrl(model.sourceUrl)">
                    {{ model.sourceUrl }}
                  </UButton>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="downloadingModelId === model.id" class="app-muted text-xs">
                    {{ t("settings.transcription.model_downloading") }}
                  </span>
                  <span v-else-if="verifyingModelId === model.id" class="app-muted text-xs">
                    {{ t("settings.transcription.model_verifying") }}
                  </span>
                  <UButton
                    v-else-if="!model.installed"
                    size="sm"
                   
                    color="neutral"
                   variant="outline" @click="downloadModel(model.id)">
                    {{ t("settings.transcription.download_action") }}
                  </UButton>
                  <template v-else>
                    <UButton
                      v-if="model.checksumOk == null"
                      size="sm"
                     
                      color="neutral"
                     variant="outline" @click="verifyModel(model.id)">
                      {{ t("settings.transcription.model_verify") }}
                    </UButton>
                    <UButton
                      size="sm"
                     
                      color="neutral"
                     variant="outline" @click="removeModel(model.id)">
                      {{ t("settings.transcription.model_remove") }}
                    </UButton>
                  </template>
                  <span v-if="model.installed" class="app-muted text-xs">
                    {{ t("settings.transcription.model_installed") }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="downloadingModelId === model.id && downloadProgress[model.id]" class="mt-2 flex items-center gap-2 text-xs">
              <div class="app-meter-bg h-2 w-32 rounded-full">
                <div
                  class="h-2 rounded-full bg-[var(--app-info)]"
                  :style="{ width: `${progressPercent(model.id)}%` }"
                ></div>
              </div>
              <span class="app-muted">{{ progressLabel(model.id) }}</span>
              <span class="app-text">{{ progressPercent(model.id) }}%</span>
            </div>
          </div>
        </div>

        <div v-if="downloadError" class="app-danger-text text-xs">
          {{ downloadError }}
        </div>
      </div>
    </UCard>
  </section>
</template>

