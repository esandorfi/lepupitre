import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { PeerReviewDetail } from "@/schemas/ipc";
import { useI18n } from "@/lib/i18n";
import { createPeerReviewPageRuntime } from "@/features/feedback/composables/peerReviewPageRuntime";

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

export function usePeerReviewPageState() {
  const { t } = useI18n();
  const route = useRoute();
  const peerReviewId = computed(() => String(route.params.peerReviewId || ""));
  const reviewDetail = ref<PeerReviewDetail | null>(null);
  const error = ref<string | null>(null);
  const errorCategory = ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null);
  const isLoading = ref(false);

  const runtime = createPeerReviewPageRuntime({
    state: {
      identity: {
        peerReviewId,
      },
      model: {
        reviewDetail,
      },
      draft: {},
      ui: {
        error,
        errorCategory,
        isLoading,
      },
    },
  });

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

  onMounted(() => {
    void runtime.loadPage();
  });

  watch(peerReviewId, () => {
    void runtime.loadPage();
  });

  return {
    reviewDetail,
    error,
    isLoading,
    projectId,
    backLink,
    reviewerLabel,
    scoreEntries,
    freeTextEntries,
    formatValue,
  };
}
