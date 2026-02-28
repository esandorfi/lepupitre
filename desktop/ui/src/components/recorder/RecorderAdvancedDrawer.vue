<script setup lang="ts">
import { useI18n } from "../../lib/i18n";

const props = defineProps<{
  open: boolean;
  model: "tiny" | "base";
  mode: "auto" | "live+final" | "final-only";
  language: "auto" | "en" | "fr";
  spokenPunctuation: boolean;
  diagnosticsCode: string | null;
}>();

const emit = defineEmits<{
  (event: "toggle"): void;
  (event: "update:model", value: "tiny" | "base"): void;
  (event: "update:mode", value: "auto" | "live+final" | "final-only"): void;
  (event: "update:language", value: "auto" | "en" | "fr"): void;
  (event: "update:spokenPunctuation", value: boolean): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="app-card rounded-xl border p-3">
    <button
      class="app-link app-focus-ring text-xs font-semibold uppercase tracking-[0.16em] cursor-pointer"
      type="button"
      @click="emit('toggle')"
    >
      {{ t("audio.advanced") }}
    </button>
    <div v-if="props.open" class="mt-3 grid gap-3 md:grid-cols-2">
      <label class="space-y-1 app-text-meta">
        <span class="app-subtle">{{ t("settings.transcription.model_label") }}</span>
        <select
          class="app-input w-full rounded-lg border px-3 py-2"
          :value="props.model"
          @change="emit('update:model', ($event.target as HTMLSelectElement).value as 'tiny' | 'base')"
        >
          <option value="tiny">{{ t("settings.transcription.model_tiny") }}</option>
          <option value="base">{{ t("settings.transcription.model_base") }}</option>
        </select>
      </label>

      <label class="space-y-1 app-text-meta">
        <span class="app-subtle">{{ t("settings.transcription.mode_label") }}</span>
        <select
          class="app-input w-full rounded-lg border px-3 py-2"
          :value="props.mode"
          @change="emit('update:mode', ($event.target as HTMLSelectElement).value as 'auto' | 'live+final' | 'final-only')"
        >
          <option value="auto">{{ t("settings.transcription.mode_auto") }}</option>
          <option value="live+final">{{ t("settings.transcription.mode_live_final") }}</option>
          <option value="final-only">{{ t("settings.transcription.mode_final_only") }}</option>
        </select>
      </label>

      <label class="space-y-1 app-text-meta">
        <span class="app-subtle">{{ t("settings.transcription.language_label") }}</span>
        <select
          class="app-input w-full rounded-lg border px-3 py-2"
          :value="props.language"
          @change="emit('update:language', ($event.target as HTMLSelectElement).value as 'auto' | 'en' | 'fr')"
        >
          <option value="auto">{{ t("settings.transcription.language_auto") }}</option>
          <option value="en">{{ t("settings.transcription.language_en") }}</option>
          <option value="fr">{{ t("settings.transcription.language_fr") }}</option>
        </select>
      </label>

      <label class="flex items-center gap-2 app-text-meta">
        <input
          type="checkbox"
          :checked="props.spokenPunctuation"
          @change="emit('update:spokenPunctuation', ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ t("settings.transcription.spoken_punctuation_label") }}</span>
      </label>
    </div>
    <p v-if="props.open && props.diagnosticsCode" class="app-muted mt-2 text-xs">
      {{ t("audio.diagnostic") }}: {{ props.diagnosticsCode }}
    </p>
  </div>
</template>
