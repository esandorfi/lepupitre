<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import type { FeedbackV1 } from "@/schemas/ipc";

defineProps<{
  actions: FeedbackV1["top_actions"];
}>();

const { t } = useI18n();
</script>

<template>
  <UCard class="app-panel app-panel-compact" variant="outline">
    <div class="app-subtle text-xs uppercase tracking-[0.2em]">
      {{ t("feedback.actions") }}
    </div>
    <div v-if="actions.length === 0" class="app-muted mt-2 text-xs">
      {{ t("feedback.no_actions") }}
    </div>
    <div v-else class="mt-2 space-y-2">
      <div v-for="action in actions" :key="action.action_id">
        <div class="app-text text-sm font-semibold">{{ action.title }}</div>
        <div class="app-muted text-xs">{{ action.why_it_matters }}</div>
        <div class="app-text mt-1 text-xs">{{ action.how_to_fix }}</div>
      </div>
    </div>
  </UCard>
</template>
