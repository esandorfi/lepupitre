import type { ComputedRef, Ref } from "vue";
import { readReviewedFeedbackIds } from "@/lib/feedbackReviewState";
import { coachStore, feedbackStore } from "@/stores/app";
import type { FeedbackTimelineItem, MascotMessage } from "@/schemas/ipc";
import type {
  FeedbackTimelineFilterType,
  FeedbackTimelineScope,
  TimelineState,
} from "@/features/feedback/composables/feedbackTimelinePage.types";
import { toError } from "@/features/feedback/composables/feedbackTimelinePage.utils";

export function createTimelineRuntime(options: {
  locale: Ref<string>;
  state: ComputedRef<TimelineState>;
  scope: Ref<FeedbackTimelineScope>;
  activeProjectId: ComputedRef<string | null>;
  showMascotCard: ComputedRef<boolean>;
  focusedFeedbackId: ComputedRef<string>;
  sourceContext: ComputedRef<string>;
  entries: Ref<FeedbackTimelineItem[]>;
  reviewedIds: Ref<Set<string>>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  mascotMessage: Ref<MascotMessage | null>;
  filterType: Ref<FeedbackTimelineFilterType>;
}) {
  const {
    locale,
    state,
    scope,
    activeProjectId,
    showMascotCard,
    focusedFeedbackId,
    sourceContext,
    entries,
    reviewedIds,
    isLoading,
    error,
    mascotMessage,
    filterType,
  } = options;

  let timelineLoadSeq = 0;

  function applyFocusedContextFilters() {
    if (!focusedFeedbackId.value) {
      return;
    }
    if (sourceContext.value === "quest") {
      filterType.value = "quest_attempt";
    } else if (sourceContext.value === "boss-run") {
      filterType.value = "run";
    } else {
      filterType.value = "all";
    }
  }

  async function refreshMascotMessage(expectedSeq?: number) {
    if (!showMascotCard.value || !state.value.activeProfileId) {
      if (expectedSeq == null || expectedSeq === timelineLoadSeq) {
        mascotMessage.value = null;
      }
      return;
    }
    try {
      const message = await coachStore.getMascotContextMessage({
        routeName: "feedback",
        projectId: scope.value === "talk" ? activeProjectId.value : null,
        locale: locale.value,
      });
      if (expectedSeq != null && expectedSeq !== timelineLoadSeq) {
        return;
      }
      mascotMessage.value = message;
    } catch {
      if (expectedSeq != null && expectedSeq !== timelineLoadSeq) {
        return;
      }
      mascotMessage.value = null;
    }
  }

  async function loadTimeline() {
    const requestSeq = ++timelineLoadSeq;
    if (!state.value.activeProfileId) {
      entries.value = [];
      error.value = null;
      mascotMessage.value = null;
      reviewedIds.value = new Set();
      return;
    }
    isLoading.value = true;
    error.value = null;
    try {
      const timeline = await feedbackStore.getFeedbackTimeline(
        scope.value === "talk" ? activeProjectId.value : null,
        48
      );
      const reviewed = readReviewedFeedbackIds(state.value.activeProfileId);
      if (requestSeq !== timelineLoadSeq) {
        return;
      }
      entries.value = timeline;
      reviewedIds.value = reviewed;
      await refreshMascotMessage(requestSeq);
    } catch (err) {
      if (requestSeq !== timelineLoadSeq) {
        return;
      }
      entries.value = [];
      error.value = toError(err);
      mascotMessage.value = null;
    } finally {
      if (requestSeq === timelineLoadSeq) {
        isLoading.value = false;
      }
    }
  }

  return {
    applyFocusedContextFilters,
    refreshMascotMessage,
    loadTimeline,
  };
}
