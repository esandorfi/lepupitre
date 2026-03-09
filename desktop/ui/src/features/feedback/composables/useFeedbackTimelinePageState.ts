import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { useUiPreferences } from "@/lib/uiPreferences";
import { appState } from "@/stores/app";
import type { FeedbackTimelineItem, MascotMessage } from "@/schemas/ipc";
import {
  bindTimelineLifecycle,
  createTimelineDerivedState,
  createTimelineRuntime,
  type FeedbackTimelineFilterType,
  type FeedbackTimelineScope,
} from "@/features/feedback/composables/useFeedbackTimelinePageHelpers";

export type { FeedbackTimelineFilterType, FeedbackTimelineRow, FeedbackTimelineScope } from "@/features/feedback/composables/useFeedbackTimelinePageHelpers";

export function useFeedbackTimelinePageState() {
  const { t, locale } = useI18n();
  const route = useRoute();
  const { settings: uiSettings } = useUiPreferences();

  const state = computed(() => appState);
  const entries = ref<FeedbackTimelineItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const filterType = ref<FeedbackTimelineFilterType>("all");
  const showUnreadOnly = ref(false);
  const scope = ref<FeedbackTimelineScope>("workspace");
  const mascotMessage = ref<MascotMessage | null>(null);
  const reviewedIds = ref<Set<string>>(new Set());

  const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
  const mascotBody = computed(() =>
    uiSettings.value.mascotIntensity === "minimal" ? "" : mascotMessage.value?.body ?? ""
  );
  const activeProjectId = computed(() => state.value.activeProject?.id ?? null);
  const canUseTalkScope = computed(() => Boolean(activeProjectId.value));
  const focusedFeedbackId = computed(() => {
    const value = route.query.focus;
    if (typeof value === "string") {
      return value.trim();
    }
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0].trim();
    }
    return "";
  });
  const sourceContext = computed(() => {
    const value = route.query.source;
    if (typeof value === "string") {
      return value.trim().toLowerCase();
    }
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0].trim().toLowerCase();
    }
    return "";
  });

  const runtime = createTimelineRuntime({
    state: {
      identity: {
        locale,
        scope,
        activeProjectId,
        showMascotCard,
        focusedFeedbackId,
        sourceContext,
      },
      model: {
        appState: state,
        entries,
        reviewedIds,
        mascotMessage,
      },
      ui: {
        isLoading,
        error,
        filterType,
      },
    },
  });

  bindTimelineLifecycle({
    locale,
    uiSettings,
    state,
    activeProjectId,
    canUseTalkScope,
    scope,
    focusedFeedbackId,
    loadTimeline: runtime.loadTimeline,
    applyFocusedContextFilters: runtime.applyFocusedContextFilters,
    refreshMascotMessage: () => runtime.refreshMascotMessage(),
  });

  const derived = createTimelineDerivedState({
    t,
    entries,
    reviewedIds,
    filterType,
    showUnreadOnly,
    focusedFeedbackId,
  });

  return {
    state,
    showMascotCard,
    mascotMessage,
    mascotBody,
    canUseTalkScope,
    scope,
    filterType,
    showUnreadOnly,
    isLoading,
    error,
    setScope: (nextScope: FeedbackTimelineScope) => {
      scope.value = nextScope;
    },
    setFilterType: (nextFilter: FeedbackTimelineFilterType) => {
      filterType.value = nextFilter;
    },
    toggleUnreadOnly: () => {
      showUnreadOnly.value = !showUnreadOnly.value;
    },
    ...derived,
  };
}
