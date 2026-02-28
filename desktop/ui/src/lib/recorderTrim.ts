export type TrimWindow = {
  startSec: number;
  endSec: number;
};

export function normalizeTrimWindow(
  durationSec: number,
  startSec: number,
  endSec: number,
  minSegmentSec = 0.2
): TrimWindow {
  const duration = Number.isFinite(durationSec) ? Math.max(0, durationSec) : 0;
  if (duration <= 0) {
    return { startSec: 0, endSec: 0 };
  }

  const minSegment = Math.max(0, minSegmentSec);
  let start = Number.isFinite(startSec) ? startSec : 0;
  let end = Number.isFinite(endSec) ? endSec : duration;

  start = Math.min(duration, Math.max(0, start));
  end = Math.min(duration, Math.max(0, end));

  if (end < start) {
    [start, end] = [end, start];
  }

  if (duration <= minSegment) {
    return { startSec: 0, endSec: duration };
  }

  if (end - start < minSegment) {
    end = Math.min(duration, start + minSegment);
    if (end - start < minSegment) {
      start = Math.max(0, end - minSegment);
    }
  }

  return { startSec: start, endSec: end };
}

export function formatTrimClock(valueSec: number): string {
  if (!Number.isFinite(valueSec)) {
    return "0:00";
  }
  const totalSeconds = Math.max(0, Math.floor(valueSec));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
