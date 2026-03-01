<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { useI18n } from "../lib/i18n";
import { classifyAsrError } from "../lib/asrErrors";
import { useNavMetrics } from "../lib/navMetrics";
import { useTranscriptionSettings } from "../lib/transcriptionSettings";
import type {
  GamificationMode,
  MascotIntensity,
  PrimaryNavMode,
} from "../lib/uiPreferences";
import { useUiPreferences } from "../lib/uiPreferences";
import { invokeChecked } from "../composables/useIpc";
import {
  AsrModelDownloadPayloadSchema,
  AsrModelDownloadProgressEventSchema,
  AsrModelDownloadResultSchema,
  AsrModelRemovePayloadSchema,
  AsrModelVerifyPayloadSchema,
  AsrModelVerifyResultSchema,
  AsrModelStatus,
  AsrModelsListSchema,
  AsrSidecarStatusResponseSchema,
  EmptyPayloadSchema,
  VoidResponseSchema,
} from "../schemas/ipc";

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

const models = ref<AsrModelStatus[]>([]);
const isLoadingModels = ref(false);
const downloadingModelId = ref<string | null>(null);
const sidecarStatus = ref<"ready" | "missing" | "incompatible" | "unknown">("unknown");
const sidecarMessage = ref<string | null>(null);

const verifyingModelId = ref<string | null>(null);
const downloadError = ref<string | null>(null);
const downloadProgress = ref<Record<string, { downloadedBytes: number; totalBytes: number }>>({});

let unlistenDownloadProgress: (() => void) | null = null;

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
    await invokeChecked("asr_sidecar_status", EmptyPayloadSchema, AsrSidecarStatusResponseSchema, {});
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
    models.value = await invokeChecked("asr_models_list", EmptyPayloadSchema, AsrModelsListSchema, {});
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
    await invokeChecked(
      "asr_model_remove",
      AsrModelRemovePayloadSchema,
      VoidResponseSchema,
      { modelId }
    );
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
    await invokeChecked(
      "asr_model_verify",
      AsrModelVerifyPayloadSchema,
      AsrModelVerifyResultSchema,
      { modelId }
    );
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
    await invokeChecked(
      "asr_model_download",
      AsrModelDownloadPayloadSchema,
      AsrModelDownloadResultSchema,
      { modelId }
    );
    await refreshModels();
    await refreshSidecarStatus();
  } catch (err) {
    downloadError.value = err instanceof Error ? err.message : String(err);
  } finally {
    downloadingModelId.value = null;
    const next = { ...downloadProgress.value };
    delete next[modelId];
    downloadProgress.value = next;
  }
}

onMounted(async () => {
  await refreshModels();
  await refreshSidecarStatus();
  unlistenDownloadProgress = await listen("asr/model_download_progress/v1", (event) => {
    const parsed = AsrModelDownloadProgressEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    downloadProgress.value = {
      ...downloadProgress.value,
      [parsed.data.modelId]: {
        downloadedBytes: parsed.data.downloadedBytes,
        totalBytes: parsed.data.totalBytes,
      },
    };
  });
});

onBeforeUnmount(() => {
  unlistenDownloadProgress?.();
});
</script>

<template>
  <section class="space-y-4">
    <div class="app-card app-radius-panel-lg border p-4">
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
        <div>
          <label class="app-nav-text text-xs font-semibold">
            {{ t("settings.navigation.mode_label") }}
          </label>
          <select v-model="selectedNavMode" class="app-input mt-2 w-full rounded-lg border px-3 py-2 text-sm">
            <option
              v-for="option in navModeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <p class="app-muted mt-2 text-xs">
            {{ t("settings.navigation.mode_note") }}
          </p>
        </div>

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
            <button
              class="app-button-secondary app-focus-ring cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold"
              type="button"
              @click="resetNavMetrics"
            >
              {{ t("settings.navigation.metrics_reset") }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="app-card app-radius-panel-lg border p-4">
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
        <div>
          <label class="app-nav-text text-xs font-semibold">
            {{ t("settings.voiceup.gamification_label") }}
          </label>
          <select
            v-model="selectedGamificationMode"
            class="app-input mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option
              v-for="option in gamificationModeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <p class="app-muted mt-2 text-xs">
            {{ t("settings.voiceup.gamification_note") }}
          </p>
        </div>

        <div>
          <label class="app-nav-text text-xs font-semibold">
            {{ t("settings.voiceup.mascot_enabled_label") }}
          </label>
          <button
            type="button"
            class="app-toggle mt-2 inline-flex items-center gap-2 text-xs"
            :class="mascotEnabled ? 'app-toggle-on' : 'app-toggle-off'"
            @click="mascotEnabled = !mascotEnabled"
          >
            <span class="app-toggle-dot"></span>
            <span>
              {{ mascotEnabled ? t("settings.voiceup.mascot_on") : t("settings.voiceup.mascot_off") }}
            </span>
          </button>
          <p class="app-muted mt-2 text-xs">
            {{ t("settings.voiceup.mascot_note") }}
          </p>
        </div>

        <div>
          <label class="app-nav-text text-xs font-semibold">
            {{ t("settings.voiceup.mascot_intensity_label") }}
          </label>
          <select
            v-model="selectedMascotIntensity"
            class="app-input mt-2 w-full rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!mascotEnabled"
          >
            <option
              v-for="option in mascotIntensityOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <p class="app-muted mt-2 text-xs">
            {{ t("settings.voiceup.mascot_intensity_note") }}
          </p>
        </div>
      </div>
    </div>

    <div class="app-card app-radius-panel-lg border p-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="app-nav-text text-lg font-semibold">
            {{ t("settings.transcription.title") }}
          </h2>
          <div class="mt-1 flex items-center gap-2 text-xs">
            <span class="app-muted">{{ t("settings.transcription.sidecar_label") }}</span>
            <span
              class="app-text-caption rounded-full px-2 py-0.5 font-semibold"
              :class="sidecarStatus === 'ready'
                ? 'app-badge-success'
                : sidecarStatus === 'missing' || sidecarStatus === 'incompatible'
                  ? 'app-badge-danger'
                  : 'app-badge-neutral'"
            >
              {{ sidecarStatus === "ready"
                ? t("settings.transcription.sidecar_ready")
                : sidecarStatus === "missing"
                  ? t("settings.transcription.sidecar_missing_label")
                  : sidecarStatus === "incompatible"
                    ? t("settings.transcription.sidecar_incompatible_label")
                    : t("settings.transcription.sidecar_unknown_label") }}
            </span>
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
        <div>
          <label class="app-nav-text text-xs font-semibold">
            {{ t("settings.transcription.model_label") }}
          </label>
          <select v-model="selectedModel" class="app-input mt-2 w-full rounded-lg border px-3 py-2 text-sm">
            <option
              v-for="option in modelOptions"
              :key="option.id"
              :value="option.id"
              :disabled="!option.installed"
            >
              {{ option.label }} — {{ option.status }}
            </option>
          </select>
          <p class="app-muted mt-2 text-xs">
            {{ t("settings.transcription.model_note") }}
          </p>
        </div>

        <div>
          <label class="app-nav-text text-xs font-semibold">
            {{ t("settings.transcription.mode_label") }}
          </label>
          <select v-model="selectedMode" class="app-input mt-2 w-full rounded-lg border px-3 py-2 text-sm">
            <option v-for="option in modeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <p class="app-muted mt-2 text-xs">
            {{ t("settings.transcription.mode_note") }}
          </p>
        </div>

        <div>
          <label class="app-nav-text text-xs font-semibold">
            {{ t("settings.transcription.language_label") }}
          </label>
          <select v-model="selectedLanguage" class="app-input mt-2 w-full rounded-lg border px-3 py-2 text-sm">
            <option v-for="option in languageOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <p class="app-muted mt-2 text-xs">
            {{ t("settings.transcription.language_note") }}
          </p>
        </div>
        <div>
          <label class="app-nav-text text-xs font-semibold">
            {{ t("settings.transcription.spoken_punctuation_label") }}
          </label>
          <button
            type="button"
            class="app-toggle mt-2 inline-flex items-center gap-2 text-xs"
            :class="spokenPunctuationEnabled ? 'app-toggle-on' : 'app-toggle-off'"
            @click="spokenPunctuationEnabled = !spokenPunctuationEnabled"
          >
            <span class="app-toggle-dot"></span>
            <span>
              {{ spokenPunctuationEnabled ? t("settings.transcription.spoken_punctuation_on") : t("settings.transcription.spoken_punctuation_off") }}
            </span>
          </button>
          <p class="app-muted mt-2 text-xs">
            {{ t("settings.transcription.spoken_punctuation_note") }}
          </p>
          <p class="app-muted text-xs">
            {{ t("settings.transcription.spoken_punctuation_help") }}
          </p>
        </div>
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
                  <button
                    class="app-link max-w-[320px] truncate text-left"
                    type="button"
                    @click="openSourceUrl(model.sourceUrl)"
                  >
                    {{ model.sourceUrl }}
                  </button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="downloadingModelId === model.id" class="app-muted text-xs">
                    {{ t("settings.transcription.model_downloading") }}
                  </span>
                  <span v-else-if="verifyingModelId === model.id" class="app-muted text-xs">
                    {{ t("settings.transcription.model_verifying") }}
                  </span>
                  <button
                    v-else-if="!model.installed"
                    class="app-button-secondary cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition"
                    type="button"
                    @click="downloadModel(model.id)"
                  >
                    {{ t("settings.transcription.download_action") }}
                  </button>
                  <template v-else>
                    <button
                      v-if="model.checksumOk == null"
                      class="app-button-secondary cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition"
                      type="button"
                      @click="verifyModel(model.id)"
                    >
                      {{ t("settings.transcription.model_verify") }}
                    </button>
                    <button
                      class="app-button-secondary cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition"
                      type="button"
                      @click="removeModel(model.id)"
                    >
                      {{ t("settings.transcription.model_remove") }}
                    </button>
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
    </div>
  </section>
</template>
