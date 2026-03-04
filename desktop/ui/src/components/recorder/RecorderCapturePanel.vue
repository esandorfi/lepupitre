<script setup lang="ts">
import RecorderWaveform from "./RecorderWaveform.vue";
import type { WaveformStyle } from "../../lib/waveform";

const props = defineProps<{
  primaryLabel: string;
  primaryAction: "start" | "pause" | "resume";
  stopLabel: string;
  canPrimary: boolean;
  canStop: boolean;
  durationLabel: string;
  levelPercent: number;
  qualityLabel: string;
  qualityTone: "good" | "warn" | "danger" | "muted";
  recBadgeLabel: string;
  showRecBadge: boolean;
  livePreviewPrevious: string | null;
  livePreviewCurrent: string | null;
  waveformPeaks: number[];
  waveformStyle: WaveformStyle;
}>();

const emit = defineEmits<{
  (event: "primary"): void;
  (event: "stop"): void;
}>();

function qualityTone() {
  if (props.qualityTone === "good") {
    return "success";
  }
  if (props.qualityTone === "danger") {
    return "error";
  }
  return "neutral";
}

function primaryIcon() {
  if (props.primaryAction === "pause") {
    return "||";
  }
  return ">";
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <UButton
       
        size="lg"
        class="min-w-[180px] justify-center"
        :disabled="!props.canPrimary"
        color="primary"
       @click="emit('primary')">
        <span aria-hidden="true" class="mr-2 text-xs font-bold">{{ primaryIcon() }}</span>
        {{ props.primaryLabel }}
      </UButton>
      <UButton
       
        size="lg"
        class="min-w-[140px] justify-center"
        :disabled="!props.canStop"
        color="error"
       @click="emit('stop')">
        <span aria-hidden="true" class="mr-2 text-xs font-bold">[]</span>
        {{ props.stopLabel }}
      </UButton>
      <UBadge
        v-if="props.showRecBadge"
       
        class="px-3 py-1 uppercase tracking-[0.2em]"
       color="error" variant="solid">
        {{ props.recBadgeLabel }}
      </UBadge>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="app-text text-2xl font-bold tabular-nums">{{ props.durationLabel }}</div>
      <UBadge :color="qualityTone()" class="px-3 py-1" variant="solid">
        {{ props.qualityLabel }}
      </UBadge>
    </div>

    <div class="space-y-2">
      <RecorderWaveform :peaks="props.waveformPeaks" :style-mode="props.waveformStyle" />
      <div class="app-meter-bg h-2 w-full rounded-full">
        <div
          class="h-2 rounded-full bg-[var(--app-info)] transition-all"
          :style="{ width: `${props.levelPercent}%` }"
        ></div>
      </div>
      <div v-if="props.livePreviewPrevious || props.livePreviewCurrent" class="space-y-1">
        <p v-if="props.livePreviewPrevious" class="app-subtle app-text-meta">
          {{ props.livePreviewPrevious }}
        </p>
        <p v-if="props.livePreviewCurrent" class="app-muted app-text-meta">
          {{ props.livePreviewCurrent }}
        </p>
      </div>
    </div>
  </div>
</template>
