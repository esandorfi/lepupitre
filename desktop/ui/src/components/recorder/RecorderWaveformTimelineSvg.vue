<script setup lang="ts">
const props = defineProps<{
  timelinePath: string;
  timelineLine: string;
}>();
</script>

<template>
  <svg
    class="h-full w-full"
    viewBox="0 0 100 40"
    preserveAspectRatio="none"
    role="img"
    aria-label="Audio waveform timeline"
  >
    <line x1="0" y1="20" x2="100" y2="20" stroke="var(--app-border)" stroke-opacity="0.5" stroke-width="0.8" />
    <path d="M 0,12 L 100,12 M 0,28 L 100,28" stroke="var(--app-border)" stroke-opacity="0.25" stroke-width="0.5" />
    <path :d="props.timelinePath" fill="var(--app-info)" fill-opacity="0.2" stroke="none" />
    <polyline
      :points="props.timelineLine"
      fill="none"
      stroke="var(--app-info)"
      stroke-width="1.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <line x1="99.2" y1="3" x2="99.2" y2="37" stroke="var(--app-info)" stroke-width="1.2" />
  </svg>
</template>
