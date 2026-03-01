import { describe, expect, it } from "vitest";
import {
  normalizeRecorderQualityHintKey,
  qualityGuidanceMessageKeys,
} from "./recorderCalibration";

describe("recorderCalibration", () => {
  it("normalizes unknown quality hints to good_level", () => {
    expect(normalizeRecorderQualityHintKey("good_level")).toBe("good_level");
    expect(normalizeRecorderQualityHintKey("unknown")).toBe("good_level");
  });

  it("returns deterministic guidance key pairs per hint", () => {
    expect(qualityGuidanceMessageKeys("too_quiet")).toEqual([
      "audio.calibration_quiet_1",
      "audio.calibration_quiet_2",
    ]);
    expect(qualityGuidanceMessageKeys("too_loud")).toEqual([
      "audio.calibration_loud_1",
      "audio.calibration_loud_2",
    ]);
    expect(qualityGuidanceMessageKeys("noisy_room")).toEqual([
      "audio.calibration_noisy_1",
      "audio.calibration_noisy_2",
    ]);
    expect(qualityGuidanceMessageKeys("no_signal")).toEqual([
      "audio.calibration_no_signal_1",
      "audio.calibration_no_signal_2",
    ]);
  });
});
