export type RecorderPhase = "capture" | "quick_clean" | "analyze_export";

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

export function resolveActiveTranscriptIdForAnalysis(
  baseTranscriptId: string | null,
  editedTranscriptId: string | null
): string | null {
  return editedTranscriptId ?? baseTranscriptId;
}

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
