<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import { talkBuilderRoute } from "@/features/talks/composables/shared/talkRoutes";

const { t } = useI18n();

defineProps<{
  projectId: string;
  isExporting: boolean;
  onExport: () => void;
}>();
</script>

<template>
  <UCard class="app-panel">
    <div class="app-text-eyebrow">{{ t("builder.export") }}</div>
    <p class="app-body-muted mt-2">{{ t("builder.subtitle") }}</p>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <UButton
        size="lg"
        :disabled="isExporting"
        @click="onExport"
      >
        {{ t("builder.export") }}
      </UButton>
      <RouterLink class="app-link-meta underline" :to="talkBuilderRoute(projectId)">
        {{ t("talk_report.builder") }}
      </RouterLink>
    </div>
  </UCard>
</template>
