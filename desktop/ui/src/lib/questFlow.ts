export type QuestFlowState = {
  isAudioQuest: boolean;
  isSubmitting: boolean;
  text: string;
  submittedTextSnapshot: string | null;
  attemptId: string | null;
  transcriptId: string | null;
  audioArtifactId: string | null;
};

/**
 * Evaluates whether can submit quest text is allowed.
 */
export function canSubmitQuestText(state: QuestFlowState): boolean {
  if (state.isAudioQuest || state.isSubmitting) {
    return false;
  }
  const trimmed = state.text.trim();
  if (!trimmed) {
    return false;
  }
  return state.submittedTextSnapshot !== trimmed;
}

/**
 * Evaluates whether can analyze quest is allowed.
 */
export function canAnalyzeQuest(state: QuestFlowState): boolean {
  if (!state.attemptId) {
    return false;
  }
  if (!state.isAudioQuest) {
    return true;
  }
  return Boolean(state.transcriptId);
}

/**
 * Evaluates whether can leave quest without feedback is allowed.
 */
export function canLeaveQuestWithoutFeedback(state: QuestFlowState): boolean {
  return state.isAudioQuest && Boolean(state.audioArtifactId) && !state.transcriptId;
}

/**
 * Implements quest analysis hint key behavior.
 */
export function questAnalysisHintKey(state: QuestFlowState): string {
  if (!state.attemptId) {
    if (state.isAudioQuest) {
      return "quest.analysis_wait_record";
    }
    return state.text.trim() ? "quest.analysis_wait_submit" : "quest.analysis_wait_capture";
  }
  if (state.isAudioQuest && !state.transcriptId) {
    return "quest.analysis_wait_transcript";
  }
  return "quest.analysis_ready";
}
