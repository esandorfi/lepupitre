import { describe, expect, it } from "vitest";
import { useHomePresentation } from "./useHomePresentation";

describe("useHomePresentation", () => {
  const t = (key: string) => key;
  const presentation = useHomePresentation(t);

  it("resolves attempt status by priority", () => {
    expect(
      presentation.attemptStatus({
        has_feedback: true,
        has_transcript: true,
        has_audio: true,
      } as never)
    ).toBe("quest.status_feedback");

    expect(
      presentation.attemptStatus({
        has_feedback: false,
        has_transcript: true,
        has_audio: true,
      } as never)
    ).toBe("quest.status_transcribed");

    expect(
      presentation.attemptStatus({
        has_feedback: false,
        has_transcript: false,
        has_audio: true,
      } as never)
    ).toBe("quest.status_recorded");
  });

  it("maps output labels", () => {
    expect(presentation.outputLabel("audio")).toBe("quest.output_audio");
    expect(presentation.outputLabel("text")).toBe("quest.output_text");
  });

  it("formats quest map aria labels with fallback category", () => {
    expect(
      presentation.questMapNodeAriaLabel({
        id: "n1",
        label: "Node 1",
        reward: 10,
        category: null,
        done: false,
        current: true,
        offsetPx: 0,
      })
    ).toBe("Node 1 (training.quest_map_any_category)");
  });

  it("computes class variants for reward badges", () => {
    expect(presentation.rewardBadgeClass(true, false)).toContain("color-success");
    expect(presentation.rewardBadgeClass(false, true)).toContain("color-accent");
    expect(presentation.rewardBadgeClass(false, false)).toContain("color-surface-elevated");
  });

  it("converts unknown errors to string messages", () => {
    expect(presentation.toError(new Error("boom"))).toBe("boom");
    expect(presentation.toError("raw")).toBe("raw");
  });
});
