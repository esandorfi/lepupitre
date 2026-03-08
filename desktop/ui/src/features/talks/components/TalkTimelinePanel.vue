<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import type { TimelineItem } from "@/features/talks/composables/reportPage/talkReportPageHelpers";
import { formatDate } from "@/features/talks/composables/reportPage/talkReportPageHelpers";

const { t } = useI18n();

defineProps<{
  items: TimelineItem[];
}>();
</script>

<template>
  <UCard class="app-panel" variant="outline">
    <div class="app-text-eyebrow">{{ t("talk_report.timeline") }}</div>
    <div v-if="items.length === 0" class="app-muted app-text-body mt-3">
      {{ t("talk_report.timeline_empty") }}
    </div>
    <div v-else class="mt-3 space-y-2 app-text-meta">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
      >
        <div>
          <div class="app-text text-sm">{{ item.label }}</div>
          <div class="app-muted app-text-meta">
            {{ formatDate(item.date) }} - {{ item.status }}
            <span v-if="item.meta">- {{ item.meta }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <RouterLink v-if="item.to" class="app-link text-xs underline" :to="item.to">
            {{ t("talk_report.view_item") }}
          </RouterLink>
        </div>
      </div>
    </div>
  </UCard>
</template>
