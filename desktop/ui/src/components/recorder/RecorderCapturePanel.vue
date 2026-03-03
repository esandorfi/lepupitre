<script setup lang="ts">
import AppBadge from "@/components/ui/AppBadge.vue";
import AppButton from "@/components/ui/AppButton.vue";
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
    return "danger";
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
      <AppButton
        tone="primary"
        size="lg"
        class="min-w-[180px] justify-center"
        :disabled="!props.canPrimary"
        @click="emit('primary')"
      >
        <span aria-hidden="true" class="mr-2 text-xs font-bold">{{ primaryIcon() }}</span>
        {{ props.primaryLabel }}
      </AppButton>
      <AppButton
        tone="danger"
        size="lg"
        class="min-w-[140px] justify-center"
        :disabled="!props.canStop"
        @click="emit('stop')"
      >
        <span aria-hidden="true" class="mr-2 text-xs font-bold">[]</span>
        {{ props.stopLabel }}
      </AppButton>
      <AppBadge
        v-if="props.showRecBadge"
        tone="danger"
        class="px-3 py-1 uppercase tracking-[0.2em]"
      >
        {{ props.recBadgeLabel }}
      </AppBadge>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="app-text text-2xl font-bold tabular-nums">{{ props.durationLabel }}</div>
      <AppBadge :tone="qualityTone()" class="px-3 py-1">
        {{ props.qualityLabel }}
      </AppBadge>
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
