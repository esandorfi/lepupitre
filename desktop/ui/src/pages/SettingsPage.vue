<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "../lib/i18n";
import { useTranscriptionSettings } from "../lib/transcriptionSettings";

const { t } = useI18n();
const { settings, updateSettings } = useTranscriptionSettings();

const modelOptions = computed(() => [
  {
    id: "tiny",
    label: t("settings.transcription.model_tiny"),
    status: t("settings.transcription.model_bundled"),
    installed: true,
  },
  {
    id: "base",
    label: t("settings.transcription.model_base"),
    status: t("settings.transcription.model_download"),
    installed: false,
  },
]);

const modeOptions = computed(() => [
  { value: "auto", label: t("settings.transcription.mode_auto") },
  { value: "live+final", label: t("settings.transcription.mode_live_final") },
  { value: "final-only", label: t("settings.transcription.mode_final_only") },
]);

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
</script>

<template>
  <section class="space-y-4">
    <div class="app-card rounded-2xl border p-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="app-nav-text text-lg font-semibold">
            {{ t("settings.transcription.title") }}
          </h2>
          <p class="app-muted text-xs">
            {{ t("settings.transcription.subtitle") }}
          </p>
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
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          class="app-button-secondary cursor-not-allowed rounded-full px-3 py-2 text-xs font-semibold opacity-60"
          type="button"
          disabled
        >
          {{ t("settings.transcription.download_base") }}
        </button>
        <span class="app-muted text-xs">
          {{ t("settings.transcription.download_note") }}
        </span>
      </div>
    </div>
  </section>
</template>
