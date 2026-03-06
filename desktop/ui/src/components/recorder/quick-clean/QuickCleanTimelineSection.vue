<script setup lang="ts">
import type {
  RawTimelineChunk,
  TimelineMarker,
} from "@/components/recorder/composables/quickClean/quickClean.types";
import { useI18n } from "@/lib/i18n";

const props = defineProps<{
  timelineMarkers: TimelineMarker[];
  rawTimelineChunks: RawTimelineChunk[];
  formatTimelineClock: (totalMs: number) => string;
}>();

const emit = defineEmits<{
  (event: "seek", value: number): void;
}>();

const { t } = useI18n();
</script>

<template>
  <UCard as="section" class="app-panel app-panel-compact space-y-3" variant="outline">
    <h3 class="app-text font-semibold">{{ t("audio.quick_clean_timeline_title") }}</h3>
    <p class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_hint") }}</p>
    <div v-if="props.timelineMarkers.length > 0" class="max-h-44 space-y-2 overflow-y-auto pr-1">
      <UButton
        v-for="marker in props.timelineMarkers"
        :key="marker.atMs"
        size="sm"
        class="w-full justify-start gap-3 rounded-lg px-3 py-2 text-left"
        color="neutral"
        variant="ghost"
        @click="emit('seek', marker.atMs)"
      >
        <span class="app-pill-active-neutral inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-1 text-xs">
          {{ marker.label }}
        </span>
        <span class="app-text-body line-clamp-2">{{ marker.preview }}</span>
      </UButton>
    </div>
    <p v-else class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_empty") }}</p>
  </UCard>

  <details class="app-radius-panel-md space-y-3 border bg-[var(--color-surface-elevated)] p-4">
    <summary class="cursor-pointer app-text font-semibold">
      <span class="collapse-chevron mr-1" aria-hidden="true">></span>
      {{ t("audio.quick_clean_raw_chunks_title") }}
    </summary>
    <p class="app-muted app-text-meta">{{ t("audio.quick_clean_raw_chunks_hint") }}</p>
    <div v-if="props.rawTimelineChunks.length > 0" class="max-h-56 space-y-2 overflow-y-auto pr-1">
      <div
        v-for="chunk in props.rawTimelineChunks"
        :key="`${chunk.startMs}-${chunk.endMs}`"
        class="app-surface rounded-lg border border-[var(--color-border-muted)] px-3 py-2"
      >
        <UButton
          size="sm"
          class="app-link text-xs underline"
          color="neutral"
          variant="ghost"
          @click="emit('seek', chunk.startMs)"
        >
          {{ props.formatTimelineClock(chunk.startMs) }} - {{ props.formatTimelineClock(chunk.endMs) }}
        </UButton>
        <p class="mt-1 app-text-body">{{ chunk.text }}</p>
      </div>
    </div>
    <p v-else class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_empty") }}</p>
  </details>
</template>

<style scoped>
summary {
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

.collapse-chevron {
  display: inline-block;
  transition: transform 120ms ease-out;
}

details[open] > summary .collapse-chevron {
  transform: rotate(90deg);
}
</style>
