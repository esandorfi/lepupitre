import { isTypingTargetElement, resolveRecorderShortcutAction } from "@/lib/recorderFlow";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

/**
 * Implements go analyze export behavior.
 */
export function goAnalyzeExport(deps: AudioRecorderRuntimeDeps) {
  if (!deps.activeTranscriptIdForAnalysis.value) {
    return;
  }
  deps.phase.value = "analyze_export";
}

/**
 * Implements back to quick clean behavior.
 */
export function backToQuickClean(deps: AudioRecorderRuntimeDeps) {
  deps.phase.value = "quick_clean";
}

/**
 * Implements request analyze behavior.
 */
export function requestAnalyze(deps: AudioRecorderRuntimeDeps) {
  if (!deps.activeTranscriptIdForAnalysis.value || !deps.canAnalyzeRecorder.value) {
    return;
  }
  deps.emit("analyze", { transcriptId: deps.activeTranscriptIdForAnalysis.value });
}

/**
 * Implements handle view feedback behavior.
 */
export function handleViewFeedback(deps: AudioRecorderRuntimeDeps) {
  deps.emit("viewFeedback");
}

/**
 * Implements handle onboarding context behavior.
 */
export function handleOnboardingContext(
  deps: AudioRecorderRuntimeDeps,
  payload: {
    audience: string;
    audienceCustom: string;
    goal: string;
    targetMinutes: number | null;
  }
) {
  deps.emit("onboardingContext", payload);
}

/**
 * Implements handle capture primary action behavior.
 */
export async function handleCapturePrimaryAction(deps: AudioRecorderRuntimeDeps) {
  if (deps.isStarting.value) {
    return;
  }
  if (deps.isRecording.value) {
    await deps.pauseRecording();
    return;
  }
  if (deps.recordingId.value && deps.isPaused.value) {
    await deps.resumeRecording();
    return;
  }
  await deps.startRecording();
}

/**
 * Implements handle shortcut behavior.
 */
export function handleShortcut(deps: AudioRecorderRuntimeDeps, event: KeyboardEvent) {
  if (isTypingTargetElement(event.target)) {
    return;
  }

  const action = resolveRecorderShortcutAction({
    key: event.key,
    ctrlOrMeta: event.metaKey || event.ctrlKey,
    phase: deps.phase.value,
    canTranscribe: deps.canTranscribe.value,
    hasTranscriptForAnalysis: !!deps.activeTranscriptIdForAnalysis.value,
  });
  if (!action) {
    return;
  }

  event.preventDefault();
  if (action === "capture_primary") {
    void deps.handleCapturePrimaryAction();
    return;
  }
  if (action === "transcribe") {
    void deps.transcribeRecording();
    return;
  }
  if (action === "continue_to_analyze_export") {
    deps.phase.value = "analyze_export";
    return;
  }
  if (action === "analyze") {
    requestAnalyze(deps);
  }
}
