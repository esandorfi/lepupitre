<script setup lang="ts">
import { RouterLink } from "vue-router";
import FeedbackActionsCard from "@/features/feedback/components/FeedbackActionsCard.vue";
import FeedbackCommentsCard from "@/features/feedback/components/FeedbackCommentsCard.vue";
import FeedbackMascotCard from "@/features/feedback/components/FeedbackMascotCard.vue";
import FeedbackMetricsCard from "@/features/feedback/components/FeedbackMetricsCard.vue";
import FeedbackNotesCard from "@/features/feedback/components/FeedbackNotesCard.vue";
import FeedbackRecommendedQuestsCard from "@/features/feedback/components/FeedbackRecommendedQuestsCard.vue";
import { useFeedbackPageState } from "@/features/feedback/composables/useFeedbackPageState";

const {
  t,
  feedback,
  mascotMessage,
  error,
  isLoading,
  note,
  noteStatus,
  reviewMarked,
  showMascotCard,
  isQuestWorldMode,
  mascotBody,
  isReviewed,
  recommendedQuestLinks,
  backLink,
  contextLabel,
  saveNote,
} = useFeedbackPageState();
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("feedback.subtitle") }}</p>
    <p v-if="isReviewed || reviewMarked" class="app-subtle text-xs font-semibold">
      {{ reviewMarked ? t("feedback.review_marked") : t("feedback.review_already") }}
    </p>

    <FeedbackMascotCard
      v-if="showMascotCard && mascotMessage"
      :message="mascotMessage"
      :body="mascotBody"
    />

    <UCard
      class="app-panel app-panel-compact text-sm"
      :class="isQuestWorldMode ? 'bg-[color-mix(in_srgb,var(--color-accent-soft)_20%,var(--color-surface))]' : ''"
      variant="outline"
    >
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("feedback.score") }}
      </div>
      <div class="app-text mt-2 text-2xl font-semibold">
        {{ feedback?.overall_score ?? "--" }}
      </div>
      <div v-if="contextLabel" class="app-muted mt-2 text-xs">
        {{ t("feedback.context_label") }}: {{ contextLabel }}
      </div>

      <div v-if="isLoading" class="app-muted mt-4 text-xs">
        {{ t("feedback.loading") }}
      </div>
      <div v-else-if="error" class="app-danger-text mt-4 text-xs">
        {{ error }}
      </div>

      <div v-else-if="feedback" class="mt-4 space-y-4">
        <FeedbackActionsCard :actions="feedback.top_actions" />
        <FeedbackRecommendedQuestsCard :links="recommendedQuestLinks" />
        <FeedbackMetricsCard :metrics="feedback.metrics" />
        <FeedbackCommentsCard :comments="feedback.comments" />
        <FeedbackNotesCard v-model:note="note" :status="noteStatus" @save="saveNote" />
      </div>
      <div v-else class="app-muted mt-4 text-xs">
        {{ t("feedback.empty") }}
      </div>

      <RouterLink class="app-link mt-4 inline-block text-xs underline" :to="backLink">
        {{ t("feedback.back_parent") }}
      </RouterLink>
    </UCard>
  </section>
</template>
