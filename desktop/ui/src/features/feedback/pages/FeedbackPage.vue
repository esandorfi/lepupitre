<script setup lang="ts">
import { reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import FeedbackActionsCard from "@/features/feedback/components/FeedbackActionsCard.vue";
import FeedbackCommentsCard from "@/features/feedback/components/FeedbackCommentsCard.vue";
import FeedbackMascotCard from "@/features/feedback/components/FeedbackMascotCard.vue";
import FeedbackMetricsCard from "@/features/feedback/components/FeedbackMetricsCard.vue";
import FeedbackNotesCard from "@/features/feedback/components/FeedbackNotesCard.vue";
import FeedbackRecommendedQuestsCard from "@/features/feedback/components/FeedbackRecommendedQuestsCard.vue";
import { useFeedbackPageState } from "@/features/feedback/composables/useFeedbackPageState";

/**
 * Page composition root (feedback detail).
 * Reads: feedback view-model state from `useFeedbackPageState`.
 * Actions: note persistence via runtime-backed `saveNote`.
 * Boundary: this page owns rendering and local i18n only.
 */
const { t } = useI18n();
const vm = reactive(useFeedbackPageState());
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("feedback.subtitle") }}</p>
    <p v-if="vm.isReviewed || vm.reviewMarked" class="app-subtle text-xs font-semibold">
      {{ vm.reviewMarked ? t("feedback.review_marked") : t("feedback.review_already") }}
    </p>

    <FeedbackMascotCard
      v-if="vm.showMascotCard && vm.mascotMessage"
      :message="vm.mascotMessage"
      :body="vm.mascotBody"
    />

    <UCard
      class="app-panel app-panel-compact text-sm"
      :class="vm.isQuestWorldMode ? 'bg-[color-mix(in_srgb,var(--color-accent-soft)_20%,var(--color-surface))]' : ''"
      variant="outline"
    >
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("feedback.score") }}
      </div>
      <div class="app-text mt-2 text-2xl font-semibold">
        {{ vm.feedback?.overall_score ?? "--" }}
      </div>
      <div v-if="vm.contextLabel" class="app-muted mt-2 text-xs">
        {{ t("feedback.context_label") }}: {{ vm.contextLabel }}
      </div>

      <div v-if="vm.isLoading" class="app-muted mt-4 text-xs">
        {{ t("feedback.loading") }}
      </div>
      <div v-else-if="vm.error" class="app-danger-text mt-4 text-xs">
        {{ vm.error }}
      </div>

      <div v-else-if="vm.feedback" class="mt-4 space-y-4">
        <FeedbackActionsCard :actions="vm.feedback.top_actions" />
        <FeedbackRecommendedQuestsCard :links="vm.recommendedQuestLinks" />
        <FeedbackMetricsCard :metrics="vm.feedback.metrics" />
        <FeedbackCommentsCard :comments="vm.feedback.comments" />
        <FeedbackNotesCard v-model:note="vm.note" :status="vm.noteStatus" @save="vm.saveNote" />
      </div>
      <div v-else class="app-muted mt-4 text-xs">
        {{ t("feedback.empty") }}
      </div>

      <RouterLink class="app-link mt-4 inline-block text-xs underline" :to="vm.backLink">
        {{ t("feedback.back_parent") }}
      </RouterLink>
    </UCard>
  </section>
</template>
