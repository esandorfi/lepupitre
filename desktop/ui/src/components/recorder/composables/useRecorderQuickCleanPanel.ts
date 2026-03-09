import { computed, ref } from "vue";
import {
  AUDIENCE_OPTIONS,
  GOAL_OPTIONS,
  type RecorderQuickCleanPanelEmit,
  type RecorderQuickCleanPanelProps,
  type TFunction,
} from "@/components/recorder/composables/quickClean/quickClean.types";
import { createOnboardingState } from "@/components/recorder/composables/quickClean/quickClean.onboarding";
import { createTrimState } from "@/components/recorder/composables/quickClean/quickClean.trim";
import {
  createTimelineState,
  formatTimelineClock,
} from "@/components/recorder/composables/quickClean/quickClean.timeline";

export { AUDIENCE_OPTIONS, GOAL_OPTIONS };
export type { RecorderQuickCleanPanelEmit, RecorderQuickCleanPanelProps };

/**
 * Provides the use recorder quick clean panel composable contract.
 */
export function useRecorderQuickCleanPanel(options: {
  props: RecorderQuickCleanPanelProps;
  emit: RecorderQuickCleanPanelEmit;
  t: TFunction;
}) {
  const { props, emit, t } = options;

  const audioPreviewRef = ref<HTMLAudioElement | null>(null);
  const showTranscriptWorkspace = computed(
    () =>
      props.reviewState === "review_transcript_ready" ||
      props.reviewState === "review_analysis_ready"
  );

  function handlePrimaryCta() {
    switch (props.reviewCta.actionName) {
      case "transcribe":
        emit("transcribe");
        break;
      case "analyze":
        emit("analyze");
        break;
      case "view_feedback":
        emit("viewFeedback");
        break;
      case "export_fallback":
        emit("continue");
        break;
    }
  }

  const onboardingState = createOnboardingState(emit);
  const trimState = createTrimState(props, emit);
  const timelineState = createTimelineState(props, t, audioPreviewRef);

  return {
    AUDIENCE_OPTIONS,
    GOAL_OPTIONS,
    audioPreviewRef,
    showTranscriptWorkspace,
    handlePrimaryCta,
    ...onboardingState,
    ...trimState,
    ...timelineState,
    formatTimelineClock,
  };
}
