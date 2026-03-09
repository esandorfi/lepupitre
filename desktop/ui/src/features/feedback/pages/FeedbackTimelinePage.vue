<script setup lang="ts">
import { reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import PageHeader from "@/components/PageHeader.vue";
import PageShell from "@/components/PageShell.vue";
import SectionPanel from "@/components/SectionPanel.vue";
import FeedbackTimelineEntriesPanel from "@/features/feedback/components/FeedbackTimelineEntriesPanel.vue";
import FeedbackTimelineFiltersPanel from "@/features/feedback/components/FeedbackTimelineFiltersPanel.vue";
import FeedbackTimelineFocusCard from "@/features/feedback/components/FeedbackTimelineFocusCard.vue";
import FeedbackTimelineMascotCard from "@/features/feedback/components/FeedbackTimelineMascotCard.vue";
import { useFeedbackTimelinePageState } from "@/features/feedback/composables/useFeedbackTimelinePageState";

/**
 * Page composition root (feedback timeline).
 * Reads: timeline projections and filters from `useFeedbackTimelinePageState`.
 * Actions: filter/scope mutations via state composable commands.
 * Boundary: page coordinates cards and sections only.
 */
const { t } = useI18n();
const vm = reactive(useFeedbackTimelinePageState());
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
      v-if="vm.showMascotCard && vm.mascotMessage"
      :message="vm.mascotMessage"
      :body="vm.mascotBody"
    />

    <SectionPanel v-if="!vm.state.activeProfileId" variant="compact">
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
        v-if="vm.focusedEntry"
        :title="vm.focusedTitle"
        :created-at-label="vm.focusedCreatedAtLabel"
        :delta-label="vm.focusedDeltaLabel"
        :action-route="vm.focusedActionRoute"
        :action-label="vm.focusedActionLabel"
        :feedback-route="vm.focusedFeedbackRoute"
      />

      <FeedbackTimelineFiltersPanel
        :visible-count="vm.visibleCount"
        :average-score="vm.averageScore"
        :notes-count="vm.notesCount"
        :scope="vm.scope"
        :can-use-talk-scope="vm.canUseTalkScope"
        :filter-type="vm.filterType"
        :show-unread-only="vm.showUnreadOnly"
        :unread-count="vm.unreadCount"
        @update:scope="vm.setScope"
        @update:filter-type="vm.setFilterType"
        @toggle-unread="vm.toggleUnreadOnly"
      />

      <FeedbackTimelineEntriesPanel
        :rows="vm.timelineRows"
        :is-loading="vm.isLoading"
        :error="vm.error"
      />
    </template>
  </PageShell>
</template>
