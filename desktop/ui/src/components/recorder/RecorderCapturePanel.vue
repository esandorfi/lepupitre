<script setup lang="ts">
import RecorderWaveform from "./RecorderWaveform.vue";

const props = defineProps<{
  primaryLabel: string;
  stopLabel: string;
  canPrimary: boolean;
  canStop: boolean;
  durationLabel: string;
  levelPercent: number;
  qualityLabel: string;
  qualityTone: "good" | "warn" | "danger" | "muted";
  recBadgeLabel: string;
  showRecBadge: boolean;
  livePreview: string | null;
  waveformPeaks: number[];
  waveformStyle: "classic" | "pulse-bars" | "ribbon" | "spark";
}>();

const emit = defineEmits<{
  (event: "primary"): void;
  (event: "stop"): void;
}>();

function qualityClass() {
  if (props.qualityTone === "good") {
    return "app-badge-success";
  }
  if (props.qualityTone === "warn") {
    return "app-badge-warning";
  }
  if (props.qualityTone === "danger") {
    return "app-badge-danger";
  }
  return "app-badge-neutral";
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <button
        class="app-button-primary app-focus-ring app-button-lg inline-flex min-w-[180px] items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canPrimary"
        @click="emit('primary')"
      >
        {{ props.primaryLabel }}
      </button>
      <button
        class="app-button-danger app-focus-ring app-button-lg inline-flex min-w-[140px] items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canStop"
        @click="emit('stop')"
      >
        {{ props.stopLabel }}
      </button>
      <span
        v-if="props.showRecBadge"
        class="app-badge-danger rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
      >
        {{ props.recBadgeLabel }}
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="app-text text-2xl font-bold tabular-nums">{{ props.durationLabel }}</div>
      <span
        class="rounded-full px-3 py-1 text-xs font-semibold"
        :class="qualityClass()"
      >
        {{ props.qualityLabel }}
      </span>
    </div>

    <div class="space-y-2">
      <RecorderWaveform :peaks="props.waveformPeaks" :style-mode="props.waveformStyle" />
      <div class="app-meter-bg h-2 w-full rounded-full">
        <div
          class="h-2 rounded-full bg-[var(--app-info)] transition-all"
          :style="{ width: `${props.levelPercent}%` }"
        ></div>
      </div>
      <p v-if="props.livePreview" class="app-muted app-text-meta">
        {{ props.livePreview }}
      </p>
    </div>
  </div>
</template>
