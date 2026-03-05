<script setup lang="ts">
import { ref } from "vue";
import type { TranscriptExportFormat } from "@/schemas/ipc";
import { useI18n } from "@/lib/i18n";

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
      <UButton
       
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        color="primary"
       @click="emit('exportPreset', 'presentation')">
        {{ t("audio.export_preset_presentation") }}
      </UButton>
      <UButton
       
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        color="neutral"
       variant="outline" @click="emit('exportPreset', 'podcast')">
        {{ t("audio.export_preset_podcast") }}
      </UButton>
      <UButton
       
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        color="neutral"
       variant="outline" @click="emit('exportPreset', 'voice_note')">
        {{ t("audio.export_preset_voice_note") }}
      </UButton>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UButton
       
        size="lg"
        :disabled="!props.canAnalyze || props.isAnalyzing"
        color="info"
       @click="emit('analyze')">
        {{ t("quest.analyze") }}
      </UButton>
      <UButton
       
        size="lg"
        color="neutral"
       variant="outline" @click="showMoreFormats = !showMoreFormats">
        {{ t("audio.more_formats") }}
      </UButton>
      <UButton
       
        size="lg"
        color="neutral"
       variant="outline" @click="emit('back')">
        {{ t("audio.back_to_quick_clean") }}
      </UButton>
    </div>

    <div v-if="showMoreFormats" class="flex flex-wrap items-center gap-2">
      <UButton
       
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        color="info"
       @click="emit('exportFormat', 'txt')">
        .txt
      </UButton>
      <UButton
       
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        color="info"
       @click="emit('exportFormat', 'json')">
        .json
      </UButton>
      <UButton
       
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        color="info"
       @click="emit('exportFormat', 'srt')">
        .srt
      </UButton>
      <UButton
       
        size="lg"
        :disabled="!props.canExport || props.isExporting"
        color="info"
       @click="emit('exportFormat', 'vtt')">
        .vtt
      </UButton>
    </div>

    <div v-if="props.exportPath" class="flex flex-wrap items-center gap-2 app-text-meta">
      <UButton size="sm" color="neutral" variant="ghost" @click="emit('openExportPath')">
        {{ t("audio.open_export") }}
      </UButton>
      <span class="app-link">{{ t("audio.exported_to") }}:</span>
      <span class="app-text max-w-[360px] truncate" style="direction: rtl; text-align: left;">
        {{ props.exportPath }}
      </span>
    </div>
  </div>
</template>
