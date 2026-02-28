<script setup lang="ts">
import { ref } from "vue";
import type { TranscriptExportFormat } from "../../schemas/ipc";
import { useI18n } from "../../lib/i18n";

const props = defineProps<{
  canAnalyze: boolean;
  isAnalyzing: boolean;
  canExport: boolean;
  isExporting: boolean;
  exportPath: string | null;
}>();

const emit = defineEmits<{
  (event: "analyze"): void;
  (event: "exportPreset", preset: "presentation" | "podcast" | "voice_note"): void;
  (event: "exportFormat", format: TranscriptExportFormat): void;
  (event: "openExportPath"): void;
  (event: "back"): void;
}>();

const showMoreFormats = ref(false);
const { t } = useI18n();
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <button
        class="app-button-primary app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportPreset', 'presentation')"
      >
        {{ t("audio.export_preset_presentation") }}
      </button>
      <button
        class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportPreset', 'podcast')"
      >
        {{ t("audio.export_preset_podcast") }}
      </button>
      <button
        class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportPreset', 'voice_note')"
      >
        {{ t("audio.export_preset_voice_note") }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        class="app-button-info app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canAnalyze || props.isAnalyzing"
        @click="emit('analyze')"
      >
        {{ t("quest.analyze") }}
      </button>
      <button
        class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        @click="showMoreFormats = !showMoreFormats"
      >
        {{ t("audio.more_formats") }}
      </button>
      <button
        class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center cursor-pointer"
        type="button"
        @click="emit('back')"
      >
        {{ t("audio.back_to_quick_clean") }}
      </button>
    </div>

    <div v-if="showMoreFormats" class="flex flex-wrap items-center gap-2">
      <button
        class="app-button-info app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportFormat', 'txt')"
      >
        .txt
      </button>
      <button
        class="app-button-info app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportFormat', 'json')"
      >
        .json
      </button>
      <button
        class="app-button-info app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportFormat', 'srt')"
      >
        .srt
      </button>
      <button
        class="app-button-info app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportFormat', 'vtt')"
      >
        .vtt
      </button>
    </div>

    <div v-if="props.exportPath" class="flex flex-wrap items-center gap-2 app-text-meta">
      <button class="app-link underline cursor-pointer" type="button" @click="emit('openExportPath')">
        {{ t("audio.open_export") }}
      </button>
      <span class="app-link">{{ t("audio.exported_to") }}:</span>
      <span class="app-text max-w-[360px] truncate" style="direction: rtl; text-align: left;">
        {{ props.exportPath }}
      </span>
    </div>
  </div>
</template>
