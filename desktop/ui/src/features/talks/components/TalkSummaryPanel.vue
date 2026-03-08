<script setup lang="ts">
import { useI18n } from "@/lib/i18n";

const { t } = useI18n();

defineProps<{
  isLoading: boolean;
  error: string | null;
  summary: {
    total: number;
    started: number;
    feedbackCount: number;
  };
  lastActivity: string;
}>();
</script>

<template>
  <UCard class="app-panel" variant="outline">
    <div v-if="isLoading" class="app-muted app-text-meta">
      {{ t("talk_report.loading") }}
    </div>
    <div v-else-if="error" class="app-danger-text app-text-meta">
      {{ error }}
    </div>
    <div v-else class="app-data-grid-4 app-text-meta">
      <UCard as="div" class="app-panel app-panel-compact" variant="outline">
        <div class="app-text-eyebrow">{{ t("talk_report.total") }}</div>
        <div class="app-text mt-1 text-lg font-semibold">{{ summary.total }}</div>
      </UCard>
      <UCard as="div" class="app-panel app-panel-compact" variant="outline">
        <div class="app-text-eyebrow">{{ t("talk_report.started") }}</div>
        <div class="app-text mt-1 text-lg font-semibold">{{ summary.started }}</div>
      </UCard>
      <UCard as="div" class="app-panel app-panel-compact" variant="outline">
        <div class="app-text-eyebrow">{{ t("talk_report.feedback") }}</div>
        <div class="app-text mt-1 text-lg font-semibold">{{ summary.feedbackCount }}</div>
      </UCard>
      <UCard as="div" class="app-panel app-panel-compact" variant="outline">
        <div class="app-text-eyebrow">{{ t("talk_report.last_activity") }}</div>
        <div class="app-text mt-1 text-sm font-semibold">{{ lastActivity }}</div>
      </UCard>
    </div>
  </UCard>
</template>
