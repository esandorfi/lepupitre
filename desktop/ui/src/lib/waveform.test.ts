import { describe, expect, it } from "vitest";
import {
  normalizeWaveformPeaks,
  resolveWaveformStyle,
  WAVEFORM_STYLES,
} from "./waveform";

describe("waveform", () => {
  it("falls back to classic style when persisted value is invalid", () => {
    expect(resolveWaveformStyle("classic")).toBe("classic");
    expect(resolveWaveformStyle("ribbon")).toBe("ribbon");
    expect(resolveWaveformStyle("unknown-style")).toBe("classic");
    expect(resolveWaveformStyle(null)).toBe("classic");
  });

  it("keeps waveform timeline normalization stable when style changes", () => {
    const sourcePeaks = [0.2, 1.4, -0.5, 0.6];
    const baseline = normalizeWaveformPeaks(sourcePeaks, 8);

    for (const style of WAVEFORM_STYLES) {
      expect(resolveWaveformStyle(style)).toBe(style);
      expect(normalizeWaveformPeaks(sourcePeaks, 8)).toEqual(baseline);
    }

    expect(baseline).toEqual([0.2, 1, 0, 0.6]);
  });

  it("returns fallback bars when no peaks are available", () => {
    expect(normalizeWaveformPeaks([], 4)).toEqual([0, 0, 0, 0]);
  });
});
