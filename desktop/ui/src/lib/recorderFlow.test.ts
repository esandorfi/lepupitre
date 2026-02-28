import { describe, expect, it } from "vitest";
import {
  isTypingTargetElement,
  recorderStopTransitionPlan,
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
});
