<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  peaks: number[];
  minBars?: number;
}>();

const bars = computed(() => {
  const fallbackCount = props.minBars ?? 24;
  if (props.peaks.length > 0) {
    return props.peaks;
  }
  return Array.from({ length: fallbackCount }, () => 0);
});

function barHeight(peak: number) {
  const clamped = Math.max(0, Math.min(1, peak));
  const scaled = Math.round(clamped * 100);
  return `${Math.max(8, scaled)}%`;
}
</script>

<template>
  <div class="app-meter-bg flex h-16 w-full items-end gap-1 rounded-lg px-2 py-2">
    <span
      v-for="(peak, index) in bars"
      :key="index"
      class="flex-1 rounded-sm bg-[var(--app-info)]/80"
      :style="{ height: barHeight(peak) }"
    ></span>
  </div>
</template>
