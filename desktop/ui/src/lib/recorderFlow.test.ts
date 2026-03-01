import { describe, expect, it } from "vitest";
import {
  isTypingTargetElement,
  recorderStopTransitionPlan,
  resolveRecorderTranscribeReadiness,
  resolveRecorderShortcutAction,
  resolveActiveTranscriptIdForAnalysis,
} from "./recorderFlow";

describe("recorderFlow", () => {
  it("prefers edited transcript id for analysis/export", () => {
    expect(resolveActiveTranscriptIdForAnalysis("base-1", "edited-1")).toBe("edited-1");
    expect(resolveActiveTranscriptIdForAnalysis("base-1", null)).toBe("base-1");
  });

  it("moves to quick clean after stop and auto-transcribes only when enabled", () => {
    const enabled = recorderStopTransitionPlan(true, true);
    expect(enabled.nextPhase).toBe("quick_clean");
    expect(enabled.shouldAutoTranscribe).toBe(true);

    const disabled = recorderStopTransitionPlan(true, false);
    expect(disabled.nextPhase).toBe("quick_clean");
    expect(disabled.shouldAutoTranscribe).toBe(false);
  });

  it("keeps record success independent from transcription prerequisites", () => {
    const blocked = resolveRecorderTranscribeReadiness({
      hasAudioArtifact: true,
      isTranscribing: false,
      isApplyingTrim: false,
      transcribeBlockedCode: "model_missing",
    });
    expect(blocked.canTranscribe).toBe(false);
    expect(blocked.showBlockedHint).toBe(true);

    const ready = resolveRecorderTranscribeReadiness({
      hasAudioArtifact: true,
      isTranscribing: false,
      isApplyingTrim: false,
      transcribeBlockedCode: null,
    });
    expect(ready.canTranscribe).toBe(true);
    expect(ready.showBlockedHint).toBe(false);
  });

  it("detects typing targets so shortcuts can be ignored", () => {
    const textarea = { tagName: "TEXTAREA", isContentEditable: false } as unknown as EventTarget;
    const input = { tagName: "INPUT", isContentEditable: false } as unknown as EventTarget;
    const select = { tagName: "SELECT", isContentEditable: false } as unknown as EventTarget;
    const div = { tagName: "DIV", isContentEditable: false } as unknown as EventTarget;
    const editable = { tagName: "DIV", isContentEditable: true } as unknown as EventTarget;

    expect(isTypingTargetElement(textarea)).toBe(true);
    expect(isTypingTargetElement(input)).toBe(true);
    expect(isTypingTargetElement(select)).toBe(true);
    expect(isTypingTargetElement(editable)).toBe(true);
    expect(isTypingTargetElement(div)).toBe(false);
  });

  it("maps keyboard shortcuts to context-aware recorder actions", () => {
    expect(
      resolveRecorderShortcutAction({
        key: " ",
        ctrlOrMeta: false,
        phase: "capture",
        canTranscribe: false,
        hasTranscriptForAnalysis: false,
      })
    ).toBe("capture_primary");

    expect(
      resolveRecorderShortcutAction({
        key: "Enter",
        ctrlOrMeta: true,
        phase: "capture",
        canTranscribe: true,
        hasTranscriptForAnalysis: false,
      })
    ).toBe("transcribe");

    expect(
      resolveRecorderShortcutAction({
        key: "Enter",
        ctrlOrMeta: true,
        phase: "quick_clean",
        canTranscribe: false,
        hasTranscriptForAnalysis: true,
      })
    ).toBe("continue_to_analyze_export");

    expect(
      resolveRecorderShortcutAction({
        key: "Enter",
        ctrlOrMeta: true,
        phase: "analyze_export",
        canTranscribe: false,
        hasTranscriptForAnalysis: true,
      })
    ).toBe("analyze");
  });

  it("returns null when shortcuts are not applicable for current context", () => {
    expect(
      resolveRecorderShortcutAction({
        key: "Enter",
        ctrlOrMeta: true,
        phase: "capture",
        canTranscribe: false,
        hasTranscriptForAnalysis: false,
      })
    ).toBeNull();

    expect(
      resolveRecorderShortcutAction({
        key: "a",
        ctrlOrMeta: false,
        phase: "quick_clean",
        canTranscribe: true,
        hasTranscriptForAnalysis: true,
      })
    ).toBeNull();
  });
});
