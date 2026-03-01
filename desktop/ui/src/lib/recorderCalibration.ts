export type RecorderQualityHint =
  | "good_level"
  | "too_quiet"
  | "too_loud"
  | "noisy_room"
  | "no_signal";

export function normalizeRecorderQualityHintKey(raw: string): RecorderQualityHint {
  if (raw === "too_quiet") {
    return "too_quiet";
  }
  if (raw === "too_loud") {
    return "too_loud";
  }
  if (raw === "noisy_room") {
    return "noisy_room";
  }
  if (raw === "no_signal") {
    return "no_signal";
  }
  return "good_level";
}

export function qualityGuidanceMessageKeys(hint: RecorderQualityHint): string[] {
  if (hint === "too_quiet") {
    return ["audio.calibration_quiet_1", "audio.calibration_quiet_2"];
  }
  if (hint === "too_loud") {
    return ["audio.calibration_loud_1", "audio.calibration_loud_2"];
  }
  if (hint === "noisy_room") {
    return ["audio.calibration_noisy_1", "audio.calibration_noisy_2"];
  }
  if (hint === "no_signal") {
    return ["audio.calibration_no_signal_1", "audio.calibration_no_signal_2"];
  }
  return ["audio.calibration_good_1", "audio.calibration_good_2"];
}
