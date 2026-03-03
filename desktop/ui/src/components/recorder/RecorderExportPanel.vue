<script setup lang="ts">
import { ref } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
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
      <AppButton
        tone="primary"
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportPreset', 'presentation')"
      >
        {{ t("audio.export_preset_presentation") }}
      </AppButton>
      <AppButton
        tone="secondary"
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportPreset', 'podcast')"
      >
        {{ t("audio.export_preset_podcast") }}
      </AppButton>
      <AppButton
        tone="secondary"
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportPreset', 'voice_note')"
      >
        {{ t("audio.export_preset_voice_note") }}
      </AppButton>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <AppButton
        tone="info"
        size="lg"
        :disabled="!props.canAnalyze || props.isAnalyzing"
        @click="emit('analyze')"
      >
        {{ t("quest.analyze") }}
      </AppButton>
      <AppButton
        tone="secondary"
        size="lg"
        @click="showMoreFormats = !showMoreFormats"
      >
        {{ t("audio.more_formats") }}
      </AppButton>
      <AppButton
        tone="secondary"
        size="lg"
        @click="emit('back')"
      >
        {{ t("audio.back_to_quick_clean") }}
      </AppButton>
    </div>

    <div v-if="showMoreFormats" class="flex flex-wrap items-center gap-2">
      <AppButton
        tone="info"
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportFormat', 'txt')"
      >
        .txt
      </AppButton>
      <AppButton
        tone="info"
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportFormat', 'json')"
      >
        .json
      </AppButton>
      <AppButton
        tone="info"
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportFormat', 'srt')"
      >
        .srt
      </AppButton>
      <AppButton
        tone="info"
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        @click="emit('exportFormat', 'vtt')"
      >
        .vtt
      </AppButton>
    </div>

    <div v-if="props.exportPath" class="flex flex-wrap items-center gap-2 app-text-meta">
      <AppButton tone="ghost" size="sm" @click="emit('openExportPath')">
        {{ t("audio.open_export") }}
      </AppButton>
      <span class="app-link">{{ t("audio.exported_to") }}:</span>
      <span class="app-text max-w-[360px] truncate" style="direction: rtl; text-align: left;">
        {{ props.exportPath }}
      </span>
    </div>
  </div>
</template>
