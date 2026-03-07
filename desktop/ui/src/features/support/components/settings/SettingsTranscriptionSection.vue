<script setup lang="ts">
import { computed } from "vue";
import type {
  TranscriptionLanguage,
  TranscriptionMode,
  TranscriptionModel,
} from "@/lib/transcriptionSettings";

type SelectOption = { value: string; label: string; disabled?: boolean };

type ModelOption = {
  id: string;
  label: string;
  installed: boolean;
  expectedBytes: number;
  checksum: string;
  sourceUrl: string;
  checksumOk: boolean | null | undefined;
  status: string;
};

const props = defineProps<{
  t: (key: string) => string;
  sidecarBadgeTone: "error" | "neutral" | "success";
  sidecarStatusLabel: string;
  sidecarMessage: string | null;
  modelSelectOptions: SelectOption[];
  modeOptions: SelectOption[];
  languageOptions: SelectOption[];
  selectedModel: TranscriptionModel;
  selectedMode: TranscriptionMode;
  selectedLanguage: TranscriptionLanguage;
  spokenPunctuationEnabled: boolean;
  isLoadingModels: boolean;
  modelOptions: ModelOption[];
  formatBytes: (value?: number | null) => string;
  shortHash: (value: string) => string;
  openSourceUrl: (url: string) => void | Promise<void>;
  progressPercent: (modelId: string) => number;
  progressLabel: (modelId: string) => string;
  downloadError: string | null;
  downloadingModelId: string | null;
  verifyingModelId: string | null;
  removeModel: (modelId: string) => void | Promise<void>;
  verifyModel: (modelId: string) => void | Promise<void>;
  downloadModel: (modelId: string) => void | Promise<void>;
}>();

const emit = defineEmits<{
  "update:selectedModel": [value: TranscriptionModel];
  "update:selectedMode": [value: TranscriptionMode];
  "update:selectedLanguage": [value: TranscriptionLanguage];
  "update:spokenPunctuationEnabled": [value: boolean];
}>();

const selectedModelModel = computed({
  get: () => props.selectedModel,
  set: (value: TranscriptionModel) => emit("update:selectedModel", value),
});

const selectedModeModel = computed({
  get: () => props.selectedMode,
  set: (value: TranscriptionMode) => emit("update:selectedMode", value),
});

const selectedLanguageModel = computed({
  get: () => props.selectedLanguage,
  set: (value: TranscriptionLanguage) => emit("update:selectedLanguage", value),
});

const spokenPunctuationEnabledModel = computed({
  get: () => props.spokenPunctuationEnabled,
  set: (value: boolean) => emit("update:spokenPunctuationEnabled", value),
});
</script>

<template>
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
          v-model="selectedModelModel"
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
          v-model="selectedModeModel"
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
          v-model="selectedLanguageModel"
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
          v-model="spokenPunctuationEnabledModel"
          :label="spokenPunctuationEnabledModel
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
                  variant="ghost"
                  @click="openSourceUrl(model.sourceUrl)"
                >
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
                  variant="outline"
                  @click="downloadModel(model.id)"
                >
                  {{ t("settings.transcription.download_action") }}
                </UButton>
                <template v-else>
                  <UButton
                    v-if="model.checksumOk == null"
                    size="sm"
                    color="neutral"
                    variant="outline"
                    @click="verifyModel(model.id)"
                  >
                    {{ t("settings.transcription.model_verify") }}
                  </UButton>
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="outline"
                    @click="removeModel(model.id)"
                  >
                    {{ t("settings.transcription.model_remove") }}
                  </UButton>
                </template>
                <span v-if="model.installed" class="app-muted text-xs">
                  {{ t("settings.transcription.model_installed") }}
                </span>
              </div>
            </div>
          </div>
          <div v-if="downloadingModelId === model.id" class="mt-2 flex items-center gap-2 text-xs">
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
</template>
