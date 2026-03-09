<script setup lang="ts">
import { reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { usePeerReviewPageState } from "@/features/feedback/composables/usePeerReviewPageState";

/**
 * Page composition root (peer review detail).
 * Reads: review payload projections from `usePeerReviewPageState`.
 * Actions: no mutating actions; display-only state.
 * Boundary: page renders review sections and local i18n labels.
 */
const { t } = useI18n();
const vm = reactive(usePeerReviewPageState());
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("peer_review.subtitle") }}</p>

    <UCard class="app-panel app-panel-compact text-sm" variant="outline">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("peer_review.title") }}
        </div>
        <RouterLink class="app-link text-xs underline" :to="vm.backLink">
          {{ t("peer_review.back") }}
        </RouterLink>
      </div>

      <div class="app-text mt-2 text-lg font-semibold">{{ vm.reviewerLabel }}</div>
      <div v-if="vm.reviewDetail" class="app-muted mt-1 text-xs">
        {{ t("peer_review.rubric") }}: {{ vm.reviewDetail.review.rubric_id }}
      </div>

      <div v-if="vm.isLoading" class="app-muted mt-4 text-xs">
        {{ t("peer_review.loading") }}
      </div>
      <div v-else-if="vm.error" class="app-danger-text mt-4 text-xs">
        {{ vm.error }}
      </div>

      <div v-else-if="vm.reviewDetail" class="mt-4 space-y-4">
        <UCard class="app-panel app-panel-compact" variant="outline">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("peer_review.scores") }}
          </div>
          <div v-if="vm.scoreEntries.length === 0" class="app-muted mt-2 text-xs">
            {{ t("peer_review.empty") }}
          </div>
          <div v-else class="mt-2 grid gap-2 text-xs sm:grid-cols-2">
            <div v-for="[key, value] in vm.scoreEntries" :key="key">
              <span class="app-muted">{{ key }}:</span>
              <span class="app-text ml-1">{{ vm.formatValue(value) }}</span>
            </div>
          </div>
        </UCard>

        <UCard class="app-panel app-panel-compact" variant="outline">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("peer_review.free_text") }}
          </div>
          <div v-if="vm.freeTextEntries.length === 0" class="app-muted mt-2 text-xs">
            {{ t("peer_review.empty") }}
          </div>
          <div v-else class="mt-2 space-y-2 text-xs">
            <div v-for="[key, value] in vm.freeTextEntries" :key="key">
              <div class="app-text font-semibold">{{ key }}</div>
              <div class="app-muted">{{ vm.formatValue(value) }}</div>
            </div>
          </div>
        </UCard>

        <UCard class="app-panel app-panel-compact text-xs" variant="outline">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("peer_review.timestamps") }}
          </div>
          <div class="app-text mt-2">
            {{ vm.reviewDetail.review.timestamps.length }}
          </div>
        </UCard>
      </div>

      <div v-else class="app-muted mt-4 text-xs">
        {{ t("peer_review.empty") }}
      </div>
    </UCard>
  </section>
</template>

