<script setup lang="ts">
import { RouterLink } from "vue-router";
import EntityRow from "@/components/EntityRow.vue";
import SectionPanel from "@/components/SectionPanel.vue";
import { useI18n } from "@/lib/i18n";
import type { FeedbackTimelineRow } from "@/features/feedback/composables/useFeedbackTimelinePageState";

defineProps<{
  rows: FeedbackTimelineRow[];
  isLoading: boolean;
  error: string | null;
}>();

const { t } = useI18n();
</script>

<template>
  <SectionPanel variant="dense-list">
    <div v-if="isLoading" class="app-muted app-text-meta">
      {{ t("feedback.loading") }}
    </div>
    <div v-else-if="error" class="app-danger-text app-text-meta">
      {{ error }}
    </div>
    <div v-else-if="rows.length === 0" class="app-muted app-text-body">
      {{ t("feedback.timeline_empty") }}
    </div>
    <div v-else class="space-y-3">
      <EntityRow v-for="item in rows" :key="item.id" :selected="item.selected">
        <template #main>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="neutral" variant="solid">
              {{ item.contextLabel }}
            </UBadge>
            <span class="app-muted app-text-meta">{{ item.createdAtLabel }}</span>
          </div>
          <div class="app-text app-text-body-strong mt-1">{{ item.title }}</div>
        </template>
        <template #actions>
          <UBadge :color="item.reviewedTone" variant="solid">
            {{ item.reviewed ? t("feedback.reviewed_label") : t("feedback.unread_label") }}
          </UBadge>
          <UBadge :color="item.scoreTone" variant="solid">
            {{ t("feedback.score") }}: {{ item.score }}
          </UBadge>
          <UBadge v-if="item.hasNote" color="neutral" variant="solid">
            {{ t("feedback.notes_title") }}
          </UBadge>
          <RouterLink class="app-link app-text-meta underline" :to="item.route">
            {{ t("feedback.timeline_open") }}
          </RouterLink>
        </template>
      </EntityRow>
    </div>
  </SectionPanel>
</template>
