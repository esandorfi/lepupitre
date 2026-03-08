<script setup lang="ts">
import { RouterLink } from "vue-router";
import { usePeerReviewPageState } from "@/features/feedback/composables/usePeerReviewPageState";

const {
  t,
  reviewDetail,
  error,
  isLoading,
  backLink,
  reviewerLabel,
  scoreEntries,
  freeTextEntries,
  formatValue,
} = usePeerReviewPageState();
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("peer_review.subtitle") }}</p>

    <UCard class="app-panel app-panel-compact text-sm" variant="outline">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("peer_review.title") }}
        </div>
        <RouterLink class="app-link text-xs underline" :to="backLink">
          {{ t("peer_review.back") }}
        </RouterLink>
      </div>

      <div class="app-text mt-2 text-lg font-semibold">{{ reviewerLabel }}</div>
      <div v-if="reviewDetail" class="app-muted mt-1 text-xs">
        {{ t("peer_review.rubric") }}: {{ reviewDetail.review.rubric_id }}
      </div>

      <div v-if="isLoading" class="app-muted mt-4 text-xs">
        {{ t("peer_review.loading") }}
      </div>
      <div v-else-if="error" class="app-danger-text mt-4 text-xs">
        {{ error }}
      </div>

      <div v-else-if="reviewDetail" class="mt-4 space-y-4">
        <UCard class="app-panel app-panel-compact" variant="outline">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("peer_review.scores") }}
          </div>
          <div v-if="scoreEntries.length === 0" class="app-muted mt-2 text-xs">
            {{ t("peer_review.empty") }}
          </div>
          <div v-else class="mt-2 grid gap-2 text-xs sm:grid-cols-2">
            <div v-for="[key, value] in scoreEntries" :key="key">
              <span class="app-muted">{{ key }}:</span>
              <span class="app-text ml-1">{{ formatValue(value) }}</span>
            </div>
          </div>
        </UCard>

        <UCard class="app-panel app-panel-compact" variant="outline">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("peer_review.free_text") }}
          </div>
          <div v-if="freeTextEntries.length === 0" class="app-muted mt-2 text-xs">
            {{ t("peer_review.empty") }}
          </div>
          <div v-else class="mt-2 space-y-2 text-xs">
            <div v-for="[key, value] in freeTextEntries" :key="key">
              <div class="app-text font-semibold">{{ key }}</div>
              <div class="app-muted">{{ formatValue(value) }}</div>
            </div>
          </div>
        </UCard>

        <UCard class="app-panel app-panel-compact text-xs" variant="outline">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("peer_review.timestamps") }}
          </div>
          <div class="app-text mt-2">
            {{ reviewDetail.review.timestamps.length }}
          </div>
        </UCard>
      </div>

      <div v-else class="app-muted mt-4 text-xs">
        {{ t("peer_review.empty") }}
      </div>
    </UCard>
  </section>
</template>

