import { ref } from "vue";
import { describe, expect, it } from "vitest";
import type { AudioRecorderState } from "@/components/recorder/composables/useAudioRecorderState";
import type { UiSettings } from "@/lib/uiPreferences";
import { createReviewPresentation } from "./audioRecorderPresentationReview";

function state(overrides: Partial<AudioRecorderState> = {}): AudioRecorderState {
  return {
    baseTranscriptId: ref<string | null>(null),
    editedTranscriptId: ref<string | null>(null),
    isTranscribing: ref(false),
    isApplyingTrim: ref(false),
    transcribeBlockedCode: ref<string | null>(null),
    transcribeProgress: ref(42),
    lastSavedPath: ref<string | null>(null),
    lastArtifactId: ref<string | null>("artifact-1"),
    ...overrides,
  } as unknown as AudioRecorderState;
}

describe("audioRecorderPresentationReview", () => {
  it("derives review state, CTA, export/open flags, and media actions from recorder refs", () => {
    const recorderState = state();
    const canAnalyze = ref(false);
    const hasAnalysisResult = ref(false);
    const review = createReviewPresentation({
      state: recorderState,
      canAnalyze,
      hasAnalysisResult,
      t: (key) => key,
      uiSettings: ref({
        primaryNavMode: "sidebar-icon",
        sidebarPinned: false,
        onboardingSeen: false,
        gamificationMode: "balanced",
        mascotEnabled: true,
        mascotIntensity: "contextual",
        waveformStyle: "classic",
      } as UiSettings),
    });

    expect(review.activeTranscriptIdForAnalysis.value).toBeNull();
    expect(review.canAnalyzeRecorder.value).toBe(false);
    expect(review.reviewState.value).toBe("review_no_transcript");
    expect(review.canTranscribe.value).toBe(true);
    expect(review.reviewCta.value.actionName).toBe("transcribe");
    expect(review.canExport.value).toBe(false);
    expect(review.canOpenOriginal.value).toBe(false);
    expect(review.recorderMediaActions.value).toEqual({ canPlayback: true, canTrim: true });

    recorderState.isTranscribing.value = true;
    expect(review.reviewState.value).toBe("review_transcribing");
    expect(review.reviewCta.value).toMatchObject({
      actionName: "transcribe",
      disabled: true,
      progressPercent: 42,
    });

    recorderState.isTranscribing.value = false;
    recorderState.baseTranscriptId.value = "tx-base";
    expect(review.reviewState.value).toBe("review_transcript_ready");
    expect(review.reviewCta.value.actionName).toBe("export_fallback");

    canAnalyze.value = true;
    expect(review.canAnalyzeRecorder.value).toBe(true);
    expect(review.reviewCta.value.actionName).toBe("analyze");

    hasAnalysisResult.value = true;
    expect(review.reviewState.value).toBe("review_analysis_ready");
    expect(review.reviewCta.value.actionName).toBe("view_feedback");

    recorderState.editedTranscriptId.value = "tx-edited";
    recorderState.lastSavedPath.value = "C:/tmp/recording.wav";
    recorderState.isApplyingTrim.value = true;
    expect(review.activeTranscriptIdForAnalysis.value).toBe("tx-edited");
    expect(review.canExport.value).toBe(true);
    expect(review.canOpenOriginal.value).toBe(true);
    expect(review.recorderMediaActions.value).toEqual({ canPlayback: true, canTrim: false });
  });
});
