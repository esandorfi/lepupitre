<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import type { FeedbackV1 } from "@/schemas/ipc";

defineProps<{
  metrics: FeedbackV1["metrics"];
}>();

const { t } = useI18n();
</script>

<template>
  <UCard class="app-panel app-panel-compact" variant="outline">
    <div class="app-subtle text-xs uppercase tracking-[0.2em]">
      {{ t("feedback.metrics") }}
    </div>
    <div class="mt-2 grid gap-2 text-xs">
      <div>
        {{ t("feedback.metric_wpm") }}:
        <span class="app-text">{{ metrics.wpm.toFixed(1) }}</span>
      </div>
      <div>
        {{ t("feedback.metric_fillers") }}:
        <span class="app-text">{{ metrics.filler_per_min.toFixed(1) }}</span>
      </div>
      <div>
        {{ t("feedback.metric_pause") }}:
        <span class="app-text">{{ metrics.pause_count }}</span>
      </div>
      <div>
        {{ t("feedback.metric_sentence") }}:
        <span class="app-text">{{ metrics.avg_sentence_words.toFixed(1) }}</span>
      </div>
      <div v-if="metrics.repeat_terms.length > 0">
        {{ t("feedback.metric_repeat") }}:
        <span class="app-text">{{ metrics.repeat_terms.join(", ") }}</span>
      </div>
    </div>
  </UCard>
</template>
