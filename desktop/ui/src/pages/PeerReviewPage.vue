<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { PeerReviewDetail } from "../schemas/ipc";

const { t } = useI18n();
const route = useRoute();
const peerReviewId = computed(() => String(route.params.peerReviewId || ""));
const reviewDetail = ref<PeerReviewDetail | null>(null);
const error = ref<string | null>(null);
const isLoading = ref(false);

const projectId = computed(() => {
  if (reviewDetail.value?.project_id) {
    return reviewDetail.value.project_id;
  }
  return String(route.query.projectId || "");
});

const backLink = computed(() => {
  if (projectId.value) {
    return `/talks/${projectId.value}`;
  }
  return "/talks";
});

const reviewerLabel = computed(() => {
  const fromDetail = reviewDetail.value?.reviewer_tag;
  const fromReview = reviewDetail.value?.review.reviewer_tag;
  return fromDetail || fromReview || t("peer_review.reviewer_unknown");
});

const scoreEntries = computed(() => {
  const scores = reviewDetail.value?.review.scores ?? {};
  return Object.entries(scores);
});

const freeTextEntries = computed(() => {
  const notes = reviewDetail.value?.review.free_text ?? {};
  return Object.entries(notes);
});

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function formatValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (value == null) {
    return "--";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

onMounted(async () => {
  if (!peerReviewId.value) {
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    await appStore.bootstrap();
    reviewDetail.value = await appStore.getPeerReview(peerReviewId.value);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("peer_review.subtitle") }}</p>

    <div class="app-panel app-panel-compact text-sm">
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
        <div class="app-card rounded-xl border p-3">
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
        </div>

        <div class="app-card rounded-xl border p-3">
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
        </div>

        <div class="app-card rounded-xl border p-3 text-xs">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("peer_review.timestamps") }}
          </div>
          <div class="app-text mt-2">
            {{ reviewDetail.review.timestamps.length }}
          </div>
        </div>
      </div>

      <div v-else class="app-muted mt-4 text-xs">
        {{ t("peer_review.empty") }}
      </div>
    </div>
  </section>
</template>
