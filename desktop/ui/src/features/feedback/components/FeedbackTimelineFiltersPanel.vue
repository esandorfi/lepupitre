<script setup lang="ts">
import SectionPanel from "@/components/SectionPanel.vue";
import { useI18n } from "@/lib/i18n";
import type {
  FeedbackTimelineFilterType,
  FeedbackTimelineScope,
} from "@/features/feedback/composables/useFeedbackTimelinePageState";

const props = defineProps<{
  visibleCount: number;
  averageScore: number | null;
  notesCount: number;
  scope: FeedbackTimelineScope;
  canUseTalkScope: boolean;
  filterType: FeedbackTimelineFilterType;
  showUnreadOnly: boolean;
  unreadCount: number;
}>();

const emit = defineEmits<{
  (event: "update:scope", value: FeedbackTimelineScope): void;
  (event: "update:filterType", value: FeedbackTimelineFilterType): void;
  (event: "toggleUnread"): void;
}>();

const { t } = useI18n();
</script>

<template>
  <SectionPanel variant="compact">
    <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div class="rounded-xl border border-[var(--app-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
        <div class="app-muted app-text-caption">{{ t("feedback.timeline_total") }}</div>
        <div class="app-text app-text-section-title mt-1">{{ props.visibleCount }}</div>
      </div>
      <div class="rounded-xl border border-[var(--app-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
        <div class="app-muted app-text-caption">{{ t("feedback.timeline_average") }}</div>
        <div class="app-text app-text-section-title mt-1">{{ props.averageScore == null ? "--" : props.averageScore }}</div>
      </div>
      <div class="rounded-xl border border-[var(--app-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
        <div class="app-muted app-text-caption">{{ t("feedback.timeline_notes") }}</div>
        <div class="app-text app-text-section-title mt-1">{{ props.notesCount }}</div>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <UButton
        size="sm"
        color="neutral"
        :variant="props.scope === 'workspace' ? 'outline' : 'ghost'"
        @click="emit('update:scope', 'workspace')"
      >
        {{ t("feedback.timeline_scope_workspace") }}
      </UButton>
      <UButton
        size="sm"
        color="neutral"
        :variant="props.scope === 'talk' ? 'outline' : 'ghost'"
        :disabled="!props.canUseTalkScope"
        @click="emit('update:scope', 'talk')"
      >
        {{ t("feedback.timeline_scope_talk") }}
      </UButton>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <UButton
          size="sm"
          color="neutral"
          :variant="props.filterType === 'all' ? 'outline' : 'ghost'"
          @click="emit('update:filterType', 'all')"
        >
          {{ t("feedback.timeline_filter_all") }}
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          :variant="props.filterType === 'quest_attempt' ? 'outline' : 'ghost'"
          @click="emit('update:filterType', 'quest_attempt')"
        >
          {{ t("feedback.timeline_filter_quest") }}
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          :variant="props.filterType === 'run' ? 'outline' : 'ghost'"
          @click="emit('update:filterType', 'run')"
        >
          {{ t("feedback.timeline_filter_run") }}
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          :variant="props.showUnreadOnly ? 'outline' : 'ghost'"
          @click="emit('toggleUnread')"
        >
          {{ t("feedback.timeline_filter_unread") }} · {{ props.unreadCount }}
        </UButton>
      </div>
    </div>
  </SectionPanel>
</template>
