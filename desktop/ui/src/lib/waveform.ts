export const WAVEFORM_STYLES = ["classic", "pulse-bars", "ribbon", "spark"] as const;

export type WaveformStyle = (typeof WAVEFORM_STYLES)[number];

export function isWaveformStyle(value: unknown): value is WaveformStyle {
  return typeof value === "string" && WAVEFORM_STYLES.includes(value as WaveformStyle);
}

export function resolveWaveformStyle(value: unknown): WaveformStyle {
  if (isWaveformStyle(value)) {
    return value;
  }
  return "classic";
}

export function normalizeWaveformPeaks(peaks: number[], minBars: number): number[] {
  const fallbackBars = Math.max(1, Math.floor(minBars));
  if (!Array.isArray(peaks) || peaks.length === 0) {
    return Array.from({ length: fallbackBars }, () => 0);
  }

  return peaks.map((peak) => {
    if (!Number.isFinite(peak)) {
      return 0;
    }
    return Math.max(0, Math.min(1, peak));
  });
}
