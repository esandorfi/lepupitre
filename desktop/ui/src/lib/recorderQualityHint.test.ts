import { describe, expect, it } from "vitest";
import {
  createRecorderQualityHintStabilizer,
  normalizeRecorderQualityHint,
  updateRecorderQualityHint,
} from "./recorderQualityHint";

describe("recorderQualityHint", () => {
  it("escalates immediately from good to warning", () => {
    const state = createRecorderQualityHintStabilizer("good_level");
    const next = updateRecorderQualityHint(state, "too_quiet", 100);
    expect(next).toBe("too_quiet");
  });

  it("holds warning before returning to good", () => {
    const state = createRecorderQualityHintStabilizer("too_quiet");
    expect(updateRecorderQualityHint(state, "good_level", 100)).toBe("too_quiet");
    expect(updateRecorderQualityHint(state, "good_level", 950)).toBe("too_quiet");
    expect(updateRecorderQualityHint(state, "good_level", 1000)).toBe("good_level");
  });

  it("holds danger before de-escalating", () => {
    const state = createRecorderQualityHintStabilizer("no_signal");
    expect(updateRecorderQualityHint(state, "good_level", 100)).toBe("no_signal");
    expect(updateRecorderQualityHint(state, "good_level", 1200)).toBe("no_signal");
    expect(updateRecorderQualityHint(state, "good_level", 1300)).toBe("good_level");
  });

  it("stabilizes equal-severity warning changes", () => {
    const state = createRecorderQualityHintStabilizer("noisy_room");
    expect(updateRecorderQualityHint(state, "too_quiet", 200)).toBe("noisy_room");
    expect(updateRecorderQualityHint(state, "too_quiet", 550)).toBe("noisy_room");
    expect(updateRecorderQualityHint(state, "too_quiet", 600)).toBe("too_quiet");
  });

  it("resets candidate when signal returns to displayed key", () => {
    const state = createRecorderQualityHintStabilizer("too_quiet");
    expect(updateRecorderQualityHint(state, "good_level", 100)).toBe("too_quiet");
    expect(updateRecorderQualityHint(state, "too_quiet", 300)).toBe("too_quiet");
    expect(updateRecorderQualityHint(state, "good_level", 350)).toBe("too_quiet");
    expect(updateRecorderQualityHint(state, "good_level", 1200)).toBe("too_quiet");
  });

  it("normalizes unknown keys to good_level", () => {
    expect(normalizeRecorderQualityHint("unexpected_key")).toBe("good_level");
    expect(normalizeRecorderQualityHint(null)).toBe("good_level");
  });
});
