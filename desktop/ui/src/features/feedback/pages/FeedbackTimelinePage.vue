<script setup lang="ts">
import { RouterLink } from "vue-router";
import PageHeader from "@/components/PageHeader.vue";
import PageShell from "@/components/PageShell.vue";
import SectionPanel from "@/components/SectionPanel.vue";
import FeedbackTimelineEntriesPanel from "@/features/feedback/components/FeedbackTimelineEntriesPanel.vue";
import FeedbackTimelineFiltersPanel from "@/features/feedback/components/FeedbackTimelineFiltersPanel.vue";
import FeedbackTimelineFocusCard from "@/features/feedback/components/FeedbackTimelineFocusCard.vue";
import FeedbackTimelineMascotCard from "@/features/feedback/components/FeedbackTimelineMascotCard.vue";
import { useFeedbackTimelinePageState } from "@/features/feedback/composables/useFeedbackTimelinePageState";

const {
  t,
  state,
  showMascotCard,
  mascotMessage,
  mascotBody,
  canUseTalkScope,
  focusedEntry,
  focusedDeltaLabel,
  focusedActionRoute,
  focusedActionLabel,
  focusedTitle,
  focusedCreatedAtLabel,
  focusedFeedbackRoute,
  visibleCount,
  averageScore,
  notesCount,
  scope,
  filterType,
  showUnreadOnly,
  unreadCount,
  timelineRows,
  isLoading,
  error,
  setScope,
  setFilterType,
  toggleUnreadOnly,
} = useFeedbackTimelinePageState();
</script>

<template>
  <PageShell>
    <PageHeader
      :eyebrow="t('feedback.title')"
      :title="t('feedback.timeline_title')"
      :subtitle="t('feedback.timeline_subtitle')"
    >
      <template #actions>
        <UButton size="md" to="/training" color="primary">
          {{ t("training.start") }}
        </UButton>
      </template>
    </PageHeader>

    <FeedbackTimelineMascotCard
      v-if="showMascotCard && mascotMessage"
      :message="mascotMessage"
      :body="mascotBody"
    />

    <SectionPanel v-if="!state.activeProfileId" variant="compact">
      <p class="app-text app-text-body">{{ t("talk.need_profile") }}</p>
      <RouterLink
        class="app-link app-text-meta mt-2 inline-block underline underline-offset-4"
        to="/profiles"
      >
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </SectionPanel>

    <template v-else>
      <FeedbackTimelineFocusCard
        v-if="focusedEntry"
        :title="focusedTitle"
        :created-at-label="focusedCreatedAtLabel"
        :delta-label="focusedDeltaLabel"
        :action-route="focusedActionRoute"
        :action-label="focusedActionLabel"
        :feedback-route="focusedFeedbackRoute"
      />

      <FeedbackTimelineFiltersPanel
        :visible-count="visibleCount"
        :average-score="averageScore"
        :notes-count="notesCount"
        :scope="scope"
        :can-use-talk-scope="canUseTalkScope"
        :filter-type="filterType"
        :show-unread-only="showUnreadOnly"
        :unread-count="unreadCount"
        @update:scope="setScope"
        @update:filter-type="setFilterType"
        @toggle-unread="toggleUnreadOnly"
      />

      <FeedbackTimelineEntriesPanel
        :rows="timelineRows"
        :is-loading="isLoading"
        :error="error"
      />
    </template>
  </PageShell>
</template>
