<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import type { PeerReviewSummary } from "@/schemas/ipc";
import { talkPeerReviewRoute } from "@/features/talks/composables/shared/talkRoutes";
import { formatDate } from "@/features/talks/composables/reportPage/talkReportPageHelpers";

const { t } = useI18n();

defineProps<{
  projectId: string;
  peerReviews: PeerReviewSummary[];
  onOpenPacks?: () => void;
}>();
</script>

<template>
  <UCard class="app-panel" variant="outline">
    <div class="app-text-eyebrow">{{ t("talk_report.packs") }}</div>
    <div v-if="peerReviews.length === 0" class="app-muted app-text-body mt-3">
      {{ t("talk_report.timeline_empty") }}
    </div>
    <div v-else class="mt-3 space-y-2 app-text-meta">
      <div
        v-for="review in peerReviews"
        :key="review.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
      >
        <div>
          <div class="app-text text-sm">{{ t("talk_report.timeline_peer_review") }}</div>
          <div class="app-muted app-text-meta">
            {{ formatDate(review.created_at) }}
            <span v-if="review.reviewer_tag"> - {{ review.reviewer_tag }}</span>
          </div>
        </div>
        <RouterLink class="app-link app-text-meta underline" :to="talkPeerReviewRoute(projectId, review.id)">
          {{ t("talk_report.view_item") }}
        </RouterLink>
      </div>
    </div>
    <div class="mt-3">
      <UButton size="lg" to="/packs" color="neutral" variant="outline" @click="onOpenPacks?.()">
        {{ t("talk_report.packs") }}
      </UButton>
    </div>
  </UCard>
</template>
