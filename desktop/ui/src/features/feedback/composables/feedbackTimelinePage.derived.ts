import { computed, type ComputedRef, type Ref } from "vue";
import { trainingStore } from "@/stores/app";
import type { FeedbackTimelineItem } from "@/schemas/ipc";
import type {
  FeedbackTimelineFilterType,
  FeedbackTimelineRow,
} from "@/features/feedback/composables/feedbackTimelinePage.types";
import {
  formatDateTime,
  scoreToneClass,
} from "@/features/feedback/composables/feedbackTimelinePage.utils";

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
