<script setup lang="ts">
import { computed } from "vue";
import {
  normalizeWaveformPeaks,
  resolveWaveformStyle,
  type WaveformStyle,
} from "../../lib/waveform";

const props = defineProps<{
  peaks: number[];
  minBars?: number;
  styleMode?: WaveformStyle;
}>();

const styleMode = computed(() => resolveWaveformStyle(props.styleMode));
const bars = computed(() => {
  return normalizeWaveformPeaks(props.peaks, props.minBars ?? 24);
});
const timelinePath = computed(() => {
  const values = bars.value;
  if (values.length === 0) {
    return "";
  }
  const baseline = 20;
  const amplitude = 16;
  const topPoints: string[] = [];
  const bottomPoints: string[] = [];
  const maxIndex = Math.max(1, values.length - 1);

  for (let index = 0; index < values.length; index += 1) {
    const x = (index / maxIndex) * 100;
    const clamped = Math.max(0, Math.min(1, values[index] ?? 0));
    const yTop = baseline - clamped * amplitude;
    const yBottom = baseline + clamped * amplitude;
    topPoints.push(`${x.toFixed(3)},${yTop.toFixed(3)}`);
    bottomPoints.push(`${x.toFixed(3)},${yBottom.toFixed(3)}`);
  }

  const startBottom = bottomPoints[bottomPoints.length - 1];
  const reversedBottom = bottomPoints.reverse();
  return `M ${topPoints[0]} L ${topPoints.slice(1).join(" L ")} L ${startBottom} L ${reversedBottom
    .slice(1)
    .join(" L ")} Z`;
});
const timelineLine = computed(() => {
  const values = bars.value;
  if (values.length === 0) {
    return "";
  }
  const baseline = 20;
  const amplitude = 16;
  const maxIndex = Math.max(1, values.length - 1);
  const points: string[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const x = (index / maxIndex) * 100;
    const clamped = Math.max(0, Math.min(1, values[index] ?? 0));
    const y = baseline - clamped * amplitude;
    points.push(`${x.toFixed(3)},${y.toFixed(3)}`);
  }
  return points.join(" ");
});

function barHeight(peak: number) {
  const clamped = Math.max(0, Math.min(1, peak));
  const scaled = Math.round(clamped * 100);
  return `${Math.max(8, scaled)}%`;
}

function barClass() {
  if (styleMode.value === "pulse-bars") {
    return "rounded-sm bg-linear-to-t from-[var(--app-info)]/40 to-[var(--app-info)] pulse-bars";
  }
  if (styleMode.value === "ribbon") {
    return "rounded-full bg-linear-to-t from-[var(--app-info)]/30 to-[var(--app-info)]/95 origin-center";
  }
  if (styleMode.value === "spark") {
    return "rounded-full bg-[var(--app-info)]/90";
  }
  return "rounded-sm bg-[var(--app-info)]/80";
}

function barStyle(peak: number, index: number) {
  const clamped = Math.max(0, Math.min(1, peak));

  if (styleMode.value === "ribbon") {
    return {
      height: "100%",
      transform: `scaleY(${Math.max(0.08, clamped)})`,
      opacity: `${0.35 + clamped * 0.65}`,
    };
  }

  if (styleMode.value === "spark") {
    return {
      height: `${Math.max(4, Math.round(clamped * 22))}px`,
      opacity: `${0.3 + clamped * 0.7}`,
      transform: `translateY(${(index % 2 === 0 ? -1 : 1) * clamped * 2}px)`,
    };
  }

  if (styleMode.value === "pulse-bars") {
    return {
      height: barHeight(clamped),
      opacity: `${0.45 + clamped * 0.55}`,
      "--index": `${index}`,
    } as Record<string, string>;
  }

  return {
    height: barHeight(clamped),
    opacity: `${0.45 + clamped * 0.55}`,
  };
}
</script>

<template>
  <div
    class="app-meter-bg flex h-16 w-full rounded-lg px-2 py-2"
    :class="styleMode === 'ribbon' ? 'items-center gap-1' : 'items-end gap-1'"
  >
    <template v-if="styleMode === 'timeline'">
      <svg
        class="h-full w-full"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        role="img"
        aria-label="Audio waveform timeline"
      >
        <line x1="0" y1="20" x2="100" y2="20" stroke="var(--app-border)" stroke-opacity="0.5" stroke-width="0.8" />
        <path d="M 0,12 L 100,12 M 0,28 L 100,28" stroke="var(--app-border)" stroke-opacity="0.25" stroke-width="0.5" />
        <path
          :d="timelinePath"
          fill="var(--app-info)"
          fill-opacity="0.2"
          stroke="none"
        />
        <polyline
          :points="timelineLine"
          fill="none"
          stroke="var(--app-info)"
          stroke-width="1.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <line x1="99.2" y1="3" x2="99.2" y2="37" stroke="var(--app-info)" stroke-width="1.2" />
      </svg>
    </template>
    <span
      v-else
      v-for="(peak, index) in bars"
      :key="index"
      class="flex-1 transition-[height,transform,opacity] duration-120 ease-out"
      :class="barClass()"
      :style="barStyle(peak, index)"
    ></span>
  </div>
</template>

<style scoped>
.pulse-bars {
  animation: pulse-rise 1200ms ease-in-out infinite;
  animation-delay: calc(var(--index, 0) * 8ms);
}

@keyframes pulse-rise {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.2);
  }
}
</style>
