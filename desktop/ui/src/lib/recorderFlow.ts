export type RecorderPhase = "capture" | "quick_clean" | "analyze_export";

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
