import { computed, onMounted, watch, type ComputedRef, type Ref } from "vue";
import { readReviewedFeedbackIds } from "@/lib/feedbackReviewState";
import { appState, coachStore, feedbackStore, sessionStore, talksStore, trainingStore } from "@/stores/app";
import type { FeedbackTimelineItem, MascotMessage } from "@/schemas/ipc";

export type FeedbackTimelineFilterType = "all" | "quest_attempt" | "run";
export type FeedbackTimelineScope = "workspace" | "talk";

export type FeedbackTimelineRow = {
  id: string;
  contextLabel: string;
  createdAtLabel: string;
  title: string;
  reviewed: boolean;
  reviewedTone: "success" | "neutral";
  score: number;
  scoreTone: "success" | "neutral" | "error";
  hasNote: boolean;
  route: string;
  selected: boolean;
};

type TimelineState = typeof appState;

export function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function scoreToneClass(score: number): "success" | "neutral" | "error" {
  if (score >= 80) {
    return "success";
  }
  if (score >= 60) {
    return "neutral";
  }
  return "error";
}

export function createTimelineDerivedState(options: {
  t: (key: string) => string;
  entries: Ref<FeedbackTimelineItem[]>;
  reviewedIds: Ref<Set<string>>;
  filterType: Ref<FeedbackTimelineFilterType>;
  showUnreadOnly: Ref<boolean>;
  focusedFeedbackId: ComputedRef<string>;
}) {
  const { t, entries, reviewedIds, filterType, showUnreadOnly, focusedFeedbackId } = options;

  function feedbackContextLabel(item: FeedbackTimelineItem) {
    if (item.subject_type === "run") {
      return t("feedback.run_label");
    }
    if (item.quest_code) {
      return trainingStore.formatQuestCode(item.project_id, item.quest_code);
    }
    return t("feedback.quest_code");
  }

  function feedbackTitle(item: FeedbackTimelineItem) {
    if (item.subject_type === "run") {
      return t("feedback.timeline_run_title");
    }
    return item.quest_title || item.quest_code || t("feedback.quest_code");
  }

  const visibleEntries = computed(() =>
    entries.value.filter((item) => {
      if (filterType.value !== "all" && item.subject_type !== filterType.value) {
        return false;
      }
      if (showUnreadOnly.value && reviewedIds.value.has(item.id)) {
        return false;
      }
      return true;
    })
  );
  const averageScore = computed(() => {
    if (visibleEntries.value.length === 0) {
      return null;
    }
    const total = visibleEntries.value.reduce((sum, item) => sum + item.overall_score, 0);
    return Math.round(total / visibleEntries.value.length);
  });
  const notesCount = computed(
    () => visibleEntries.value.filter((item) => Boolean(item.note_updated_at)).length
  );
  const unreadCount = computed(
    () => entries.value.filter((item) => !reviewedIds.value.has(item.id)).length
  );

  const focusedEntry = computed(
    () => entries.value.find((item) => item.id === focusedFeedbackId.value) ?? null
  );
  const focusedEntryPrevious = computed(() => {
    if (!focusedEntry.value) {
      return null;
    }
    const sameTrack = entries.value.filter(
      (item) =>
        item.project_id === focusedEntry.value?.project_id &&
        item.subject_type === focusedEntry.value?.subject_type &&
        item.id !== focusedEntry.value?.id
    );
    return sameTrack[0] ?? null;
  });
  const focusedDelta = computed(() => {
    if (!focusedEntry.value || !focusedEntryPrevious.value) {
      return null;
    }
    return focusedEntry.value.overall_score - focusedEntryPrevious.value.overall_score;
  });
  const focusedDeltaLabel = computed(() => {
    if (focusedDelta.value == null) {
      return null;
    }
    if (focusedDelta.value > 0) {
      return `${t("feedback.timeline_focus_delta_up")} +${focusedDelta.value}`;
    }
    if (focusedDelta.value < 0) {
      return `${t("feedback.timeline_focus_delta_down")} ${focusedDelta.value}`;
    }
    return t("feedback.timeline_focus_delta_flat");
  });
  const focusedActionRoute = computed(() => {
    if (!focusedEntry.value) {
      return "/feedback";
    }
    if (focusedEntry.value.subject_type === "run") {
      return "/boss-run";
    }
    if (focusedEntry.value.quest_code) {
      return `/quest/${focusedEntry.value.quest_code}?projectId=${focusedEntry.value.project_id}&from=training`;
    }
    return "/training";
  });
  const focusedActionLabel = computed(() =>
    focusedEntry.value?.subject_type === "run"
      ? t("feedback.timeline_focus_action_run")
      : t("feedback.timeline_focus_action_quest")
  );

  const timelineRows = computed<FeedbackTimelineRow[]>(() =>
    visibleEntries.value.map((item) => {
      const reviewed = reviewedIds.value.has(item.id);
      return {
        id: item.id,
        contextLabel: feedbackContextLabel(item),
        createdAtLabel: formatDateTime(item.created_at),
        title: feedbackTitle(item),
        reviewed,
        reviewedTone: reviewed ? "neutral" : "success",
        score: item.overall_score,
        scoreTone: scoreToneClass(item.overall_score),
        hasNote: Boolean(item.note_updated_at),
        route: `/feedback/${item.id}`,
        selected: Boolean(focusedFeedbackId.value) && item.id === focusedFeedbackId.value,
      };
    })
  );

  return {
    averageScore,
    notesCount,
    unreadCount,
    focusedEntry,
    focusedDeltaLabel,
    focusedActionRoute,
    focusedActionLabel,
    focusedTitle: computed(() => (focusedEntry.value ? feedbackTitle(focusedEntry.value) : "")),
    focusedCreatedAtLabel: computed(() =>
      focusedEntry.value ? formatDateTime(focusedEntry.value.created_at) : ""
    ),
    focusedFeedbackRoute: computed(() =>
      focusedEntry.value ? `/feedback/${focusedEntry.value.id}` : "/feedback"
    ),
    visibleCount: computed(() => visibleEntries.value.length),
    timelineRows,
  };
}

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

export function bindTimelineLifecycle(options: {
  locale: Ref<string>;
  uiSettings: Ref<{ mascotEnabled: boolean; mascotIntensity: string }>;
  state: ComputedRef<TimelineState>;
  activeProjectId: ComputedRef<string | null>;
  canUseTalkScope: ComputedRef<boolean>;
  scope: Ref<FeedbackTimelineScope>;
  focusedFeedbackId: ComputedRef<string>;
  loadTimeline: () => Promise<void>;
  applyFocusedContextFilters: () => void;
  refreshMascotMessage: () => Promise<void>;
}) {
  const {
    locale,
    uiSettings,
    state,
    activeProjectId,
    canUseTalkScope,
    scope,
    focusedFeedbackId,
    loadTimeline,
    applyFocusedContextFilters,
    refreshMascotMessage,
  } = options;

  onMounted(async () => {
    await sessionStore.bootstrap();
    await talksStore.loadProjects();
    if (focusedFeedbackId.value) {
      applyFocusedContextFilters();
      scope.value = "workspace";
    }
    await loadTimeline();
  });

  watch(
    () => [state.value.activeProfileId, activeProjectId.value] as const,
    async () => {
      if (!canUseTalkScope.value && scope.value === "talk") {
        scope.value = "workspace";
        return;
      }
      await loadTimeline();
    }
  );
  watch(
    () => scope.value,
    async () => {
      await loadTimeline();
    }
  );
  watch(
    () => focusedFeedbackId.value,
    async (next) => {
      if (!next) {
        return;
      }
      applyFocusedContextFilters();
      if (scope.value !== "workspace") {
        scope.value = "workspace";
        return;
      }
      await loadTimeline();
    }
  );
  watch(
    () => [locale.value, uiSettings.value.mascotEnabled, uiSettings.value.mascotIntensity] as const,
    async () => {
      await refreshMascotMessage();
    }
  );
}
