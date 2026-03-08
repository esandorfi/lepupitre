import type { ComputedRef, Ref } from "vue";
import { readReviewedFeedbackIds } from "@/lib/feedbackReviewState";
import { coachStore, feedbackStore } from "@/stores/app";
import type { FeedbackTimelineItem, MascotMessage } from "@/schemas/ipc";
import type {
  FeedbackTimelineFilterType,
  FeedbackTimelineScope,
  TimelineState,
} from "@/features/feedback/composables/feedbackTimelinePage.types";
import {
  clearRuntimeUiError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";

export type TimelineRuntimeState = {
  identity: {
    locale: Ref<string>;
    scope: Ref<FeedbackTimelineScope>;
    activeProjectId: ComputedRef<string | null>;
    showMascotCard: ComputedRef<boolean>;
    focusedFeedbackId: ComputedRef<string>;
    sourceContext: ComputedRef<string>;
  };
  model: {
    appState: ComputedRef<TimelineState>;
    entries: Ref<FeedbackTimelineItem[]>;
    reviewedIds: Ref<Set<string>>;
    mascotMessage: Ref<MascotMessage | null>;
  };
  ui: {
    isLoading: Ref<boolean>;
    error: Ref<string | null>;
    errorCategory?: Ref<RuntimeErrorCategory | null>;
    filterType: Ref<FeedbackTimelineFilterType>;
  };
};

export type TimelineRuntimeDeps = {
  getMascotContextMessage: (args: {
    routeName: "feedback";
    projectId: string | null;
    locale: string;
  }) => Promise<MascotMessage | null>;
  getFeedbackTimeline: (
    projectId: string | null,
    limit: number
  ) => Promise<FeedbackTimelineItem[]>;
  readReviewedIds: (profileId: string) => Set<string>;
};

function createDefaultTimelineRuntimeDeps(): TimelineRuntimeDeps {
  return {
    getMascotContextMessage: (args) => coachStore.getMascotContextMessage(args),
    getFeedbackTimeline: (projectId, limit) => feedbackStore.getFeedbackTimeline(projectId, limit),
    readReviewedIds: (profileId) => readReviewedFeedbackIds(profileId),
  };
}

type TimelineRuntimeArgs = {
  state: TimelineRuntimeState;
  deps?: TimelineRuntimeDeps;
};

export function createTimelineRuntime(args: TimelineRuntimeArgs) {
  const deps = args.deps ?? createDefaultTimelineRuntimeDeps();
  const { identity, model, ui } = args.state;

  // Policy: loadTimeline uses takeLatest to keep latest timeline source-of-truth.
  let timelineLoadSeq = 0;

  function applyFocusedContextFilters() {
    if (!identity.focusedFeedbackId.value) {
      return;
    }
    if (identity.sourceContext.value === "quest") {
      ui.filterType.value = "quest_attempt";
    } else if (identity.sourceContext.value === "boss-run") {
      ui.filterType.value = "run";
    } else {
      ui.filterType.value = "all";
    }
  }

  async function refreshMascotMessage(expectedSeq?: number) {
    if (!identity.showMascotCard.value || !model.appState.value.activeProfileId) {
      if (expectedSeq == null || expectedSeq === timelineLoadSeq) {
        model.mascotMessage.value = null;
      }
      return;
    }
    try {
      const message = await deps.getMascotContextMessage({
        routeName: "feedback",
        projectId:
          identity.scope.value === "talk" ? identity.activeProjectId.value : null,
        locale: identity.locale.value,
      });
      if (expectedSeq != null && expectedSeq !== timelineLoadSeq) {
        return;
      }
      model.mascotMessage.value = message;
    } catch {
      if (expectedSeq != null && expectedSeq !== timelineLoadSeq) {
        return;
      }
      model.mascotMessage.value = null;
    }
  }

  async function loadTimeline() {
    const requestSeq = ++timelineLoadSeq;
    if (!model.appState.value.activeProfileId) {
      model.entries.value = [];
      ui.error.value = null;
      model.mascotMessage.value = null;
      model.reviewedIds.value = new Set();
      return;
    }
    ui.isLoading.value = true;
    clearRuntimeUiError(ui);
    try {
      const timeline = await deps.getFeedbackTimeline(
        identity.scope.value === "talk" ? identity.activeProjectId.value : null,
        48
      );
      const reviewed = deps.readReviewedIds(model.appState.value.activeProfileId);
      if (requestSeq !== timelineLoadSeq) {
        return;
      }
      model.entries.value = timeline;
      model.reviewedIds.value = reviewed;
      await refreshMascotMessage(requestSeq);
    } catch (err) {
      if (requestSeq !== timelineLoadSeq) {
        return;
      }
      model.entries.value = [];
      setRuntimeUiError(ui, err);
      model.mascotMessage.value = null;
    } finally {
      if (requestSeq === timelineLoadSeq) {
        ui.isLoading.value = false;
      }
    }
  }

  return {
    applyFocusedContextFilters,
    refreshMascotMessage,
    loadTimeline,
  };
}
