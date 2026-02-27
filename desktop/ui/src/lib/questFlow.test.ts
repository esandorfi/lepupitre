import { describe, expect, it } from "vitest";
import {
  canAnalyzeQuest,
  canLeaveQuestWithoutFeedback,
  canSubmitQuestText,
  questAnalysisHintKey,
  type QuestFlowState,
} from "./questFlow";

function state(overrides: Partial<QuestFlowState> = {}): QuestFlowState {
  return {
    isAudioQuest: false,
    isSubmitting: false,
    text: "",
    submittedTextSnapshot: null,
    attemptId: null,
    transcriptId: null,
    audioArtifactId: null,
    ...overrides,
  };
}

describe("questFlow", () => {
  it("allows text submit only when text changed and non-empty", () => {
    expect(canSubmitQuestText(state({ text: "hello" }))).toBe(true);
    expect(canSubmitQuestText(state({ text: "   " }))).toBe(false);
    expect(
      canSubmitQuestText(state({ text: "hello", submittedTextSnapshot: "hello" }))
    ).toBe(false);
    expect(canSubmitQuestText(state({ text: "hello", isSubmitting: true }))).toBe(false);
    expect(canSubmitQuestText(state({ text: "hello", isAudioQuest: true }))).toBe(false);
  });

  it("enforces analyze guardrails for audio vs text quests", () => {
    expect(canAnalyzeQuest(state({ attemptId: null }))).toBe(false);
    expect(canAnalyzeQuest(state({ isAudioQuest: false, attemptId: "a1" }))).toBe(true);
    expect(canAnalyzeQuest(state({ isAudioQuest: true, attemptId: "a1" }))).toBe(false);
    expect(
      canAnalyzeQuest(state({ isAudioQuest: true, attemptId: "a1", transcriptId: "t1" }))
    ).toBe(true);
  });

  it("allows audio-only leave without feedback when recorded but not transcribed", () => {
    expect(
      canLeaveQuestWithoutFeedback(
        state({ isAudioQuest: true, audioArtifactId: "audio-1", transcriptId: null })
      )
    ).toBe(true);
    expect(
      canLeaveQuestWithoutFeedback(
        state({ isAudioQuest: true, audioArtifactId: "audio-1", transcriptId: "tx-1" })
      )
    ).toBe(false);
    expect(canLeaveQuestWithoutFeedback(state({ isAudioQuest: false }))).toBe(false);
  });

  it("returns consistent analysis hint keys across progression states", () => {
    expect(questAnalysisHintKey(state({ isAudioQuest: true }))).toBe("quest.analysis_wait_record");
    expect(questAnalysisHintKey(state({ isAudioQuest: false, text: "" }))).toBe(
      "quest.analysis_wait_capture"
    );
    expect(questAnalysisHintKey(state({ isAudioQuest: false, text: "draft" }))).toBe(
      "quest.analysis_wait_submit"
    );
    expect(questAnalysisHintKey(state({ isAudioQuest: true, attemptId: "a1" }))).toBe(
      "quest.analysis_wait_transcript"
    );
    expect(
      questAnalysisHintKey(state({ isAudioQuest: true, attemptId: "a1", transcriptId: "t1" }))
    ).toBe("quest.analysis_ready");
  });
});
