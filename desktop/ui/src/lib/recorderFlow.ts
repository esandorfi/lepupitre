export type RecorderPhase = "capture" | "quick_clean" | "analyze_export";

export type ReviewState =
  | "review_no_transcript"
  | "review_transcribing"
  | "review_transcript_ready"
  | "review_analysis_ready";

export type ReviewCtaConfig = {
  labelKey: string;
  actionName: "transcribe" | "analyze" | "view_feedback" | "export_fallback";
  disabled: boolean;
  progressPercent: number | null;
};

/**
 * Resolves resolve review state from current inputs.
 */
export function resolveReviewState(input: {
  hasTranscript: boolean;
  isTranscribing: boolean;
  hasAnalysisResult: boolean;
}): ReviewState {
  if (input.hasTranscript && input.hasAnalysisResult) {
    return "review_analysis_ready";
  }
  if (input.hasTranscript) {
    return "review_transcript_ready";
  }
  if (input.isTranscribing) {
    return "review_transcribing";
  }
  return "review_no_transcript";
}

/**
 * Resolves resolve review cta from current inputs.
 */
export function resolveReviewCta(input: {
  reviewState: ReviewState;
  canTranscribe: boolean;
  canAnalyze: boolean;
  transcribeProgress: number;
}): ReviewCtaConfig {
  switch (input.reviewState) {
    case "review_no_transcript":
      return {
        labelKey: "audio.review_cta_transcribe",
        actionName: "transcribe",
        disabled: !input.canTranscribe,
        progressPercent: null,
      };
    case "review_transcribing":
      return {
        labelKey: "audio.review_cta_transcribing",
        actionName: "transcribe",
        disabled: true,
        progressPercent: input.transcribeProgress,
      };
    case "review_transcript_ready":
      if (input.canAnalyze) {
        return {
          labelKey: "audio.review_cta_analyze",
          actionName: "analyze",
          disabled: false,
          progressPercent: null,
        };
      }
      return {
        labelKey: "audio.review_cta_export",
        actionName: "export_fallback",
        disabled: false,
        progressPercent: null,
      };
    case "review_analysis_ready":
      return {
        labelKey: "audio.review_cta_view_feedback",
        actionName: "view_feedback",
        disabled: false,
        progressPercent: null,
      };
  }
}

export type RecorderShortcutAction =
  | "capture_primary"
  | "transcribe"
  | "continue_to_analyze_export"
  | "analyze"
  | null;

export type RecorderTranscribeReadiness = {
  canTranscribe: boolean;
  showBlockedHint: boolean;
};

/**
 * Resolves resolve active transcript id for analysis from current inputs.
 */
export function resolveActiveTranscriptIdForAnalysis(
  baseTranscriptId: string | null,
  editedTranscriptId: string | null
): string | null {
  return editedTranscriptId ?? baseTranscriptId;
}

/**
 * Returns whether is typing target element is true.
 */
export function isTypingTargetElement(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }
  const tag = element.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }
  return element.isContentEditable;
}

/**
 * Records recorder stop transition plan telemetry/state events.
 */
export function recorderStopTransitionPlan(
  autoTranscribeOnStop: boolean,
  canTranscribe: boolean
): {
  nextPhase: RecorderPhase;
  shouldAutoTranscribe: boolean;
} {
  return {
    nextPhase: "quick_clean",
    shouldAutoTranscribe: autoTranscribeOnStop && canTranscribe,
  };
}

/**
 * Resolves resolve recorder transcribe readiness from current inputs.
 */
export function resolveRecorderTranscribeReadiness(input: {
  hasAudioArtifact: boolean;
  isTranscribing: boolean;
  isApplyingTrim: boolean;
  transcribeBlockedCode: string | null;
}): RecorderTranscribeReadiness {
  if (!input.hasAudioArtifact || input.isTranscribing || input.isApplyingTrim) {
    return {
      canTranscribe: false,
      showBlockedHint: false,
    };
  }

  if (input.transcribeBlockedCode) {
    return {
      canTranscribe: false,
      showBlockedHint: true,
    };
  }

  return {
    canTranscribe: true,
    showBlockedHint: false,
  };
}

/**
 * Resolves resolve recorder shortcut action from current inputs.
 */
export function resolveRecorderShortcutAction(input: {
  key: string;
  ctrlOrMeta: boolean;
  phase: RecorderPhase;
  canTranscribe: boolean;
  hasTranscriptForAnalysis: boolean;
}): RecorderShortcutAction {
  if (input.key === " ") {
    return "capture_primary";
  }

  if (!(input.ctrlOrMeta && input.key === "Enter")) {
    return null;
  }

  if (input.phase === "capture" && input.canTranscribe) {
    return "transcribe";
  }

  if (input.phase === "quick_clean" && input.hasTranscriptForAnalysis) {
    return "continue_to_analyze_export";
  }

  if (input.phase === "analyze_export") {
    return "analyze";
  }

  return null;
}
