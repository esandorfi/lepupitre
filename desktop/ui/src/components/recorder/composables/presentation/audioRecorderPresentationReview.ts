import { computed } from "vue";
import { resolveRecorderMediaActions } from "@/lib/recorderSession";
import {
  resolveActiveTranscriptIdForAnalysis,
  resolveRecorderTranscribeReadiness,
  resolveReviewCta,
  resolveReviewState,
} from "@/lib/recorderFlow";
import type { AudioRecorderPresentationParams } from "@/components/recorder/composables/presentation/audioRecorderPresentation.types";

/**
 * Creates and returns the create review presentation contract.
 */
export function createReviewPresentation(params: AudioRecorderPresentationParams) {
  const { state, canAnalyze, hasAnalysisResult } = params;

  const activeTranscriptIdForAnalysis = computed(() =>
    resolveActiveTranscriptIdForAnalysis(state.baseTranscriptId.value, state.editedTranscriptId.value)
  );
  const canAnalyzeRecorder = computed(
    () => !!activeTranscriptIdForAnalysis.value && !!canAnalyze.value
  );
  const reviewState = computed(() =>
    resolveReviewState({
      hasTranscript: !!state.baseTranscriptId.value,
      isTranscribing: state.isTranscribing.value,
      hasAnalysisResult: hasAnalysisResult.value,
    })
  );
  const transcribeReadiness = computed(() =>
    resolveRecorderTranscribeReadiness({
      hasAudioArtifact: !!state.lastArtifactId.value,
      isTranscribing: state.isTranscribing.value,
      isApplyingTrim: state.isApplyingTrim.value,
      transcribeBlockedCode: state.transcribeBlockedCode.value,
    })
  );
  const canTranscribe = computed(() => transcribeReadiness.value.canTranscribe);
  const reviewCta = computed(() =>
    resolveReviewCta({
      reviewState: reviewState.value,
      canTranscribe: canTranscribe.value,
      canAnalyze: canAnalyzeRecorder.value,
      transcribeProgress: state.transcribeProgress.value,
    })
  );
  const canExport = computed(() => !!activeTranscriptIdForAnalysis.value);
  const canOpenOriginal = computed(() => !!state.lastSavedPath.value);
  const recorderMediaActions = computed(() =>
    resolveRecorderMediaActions({
      hasAudioArtifact: !!state.lastArtifactId.value,
      isApplyingTrim: state.isApplyingTrim.value,
    })
  );

  return {
    activeTranscriptIdForAnalysis,
    canAnalyzeRecorder,
    reviewState,
    transcribeReadiness,
    canTranscribe,
    reviewCta,
    canExport,
    canOpenOriginal,
    recorderMediaActions,
  };
}
