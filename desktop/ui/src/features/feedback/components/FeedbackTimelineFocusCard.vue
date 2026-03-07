<script setup lang="ts">
import SectionPanel from "@/components/SectionPanel.vue";
import { useI18n } from "@/lib/i18n";

const props = defineProps<{
  title: string;
  createdAtLabel: string;
  deltaLabel: string | null;
  actionRoute: string;
  actionLabel: string;
  feedbackRoute: string;
}>();

const { t } = useI18n();
</script>

<template>
  <SectionPanel
    variant="compact"
    class="border border-[var(--color-accent)] bg-[var(--color-surface-selected)]"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <div class="app-text-eyebrow">{{ t("feedback.timeline_focus_title") }}</div>
        <div class="app-text app-text-subheadline mt-1">{{ props.title }}</div>
        <div class="app-muted app-text-meta mt-1">
          {{ t("feedback.timeline_focus_hint") }} · {{ props.createdAtLabel }}
        </div>
        <div v-if="props.deltaLabel" class="app-text app-text-meta mt-1 font-semibold">
          {{ props.deltaLabel }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UBadge color="neutral" variant="solid">
          {{ t("feedback.timeline_focus_badge") }}
        </UBadge>
        <UButton size="sm" :to="props.actionRoute" color="neutral" variant="outline">
          {{ props.actionLabel }}
        </UButton>
        <UButton size="sm" :to="props.feedbackRoute" color="primary">
          {{ t("feedback.timeline_open") }}
        </UButton>
      </div>
    </div>
  </SectionPanel>
</template>
