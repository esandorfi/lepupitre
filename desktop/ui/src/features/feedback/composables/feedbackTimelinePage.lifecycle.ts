import { onMounted, watch, type ComputedRef, type Ref } from "vue";
import { sessionStore, talksStore } from "@/stores/app";
import type {
  FeedbackTimelineScope,
  TimelineState,
} from "@/features/feedback/composables/feedbackTimelinePage.types";

/**
 * Binds lifecycle/effect wiring for bind timeline lifecycle.
 */
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
