import { describe, expect, it } from "vitest";
import { formatTrimClock, normalizeTrimWindow } from "./recorderTrim";

describe("recorderTrim", () => {
  it("clamps and preserves a valid window", () => {
    expect(normalizeTrimWindow(120, 5, 42)).toEqual({ startSec: 5, endSec: 42 });
  });

  it("normalizes inverted boundaries", () => {
    expect(normalizeTrimWindow(120, 42, 5)).toEqual({ startSec: 5, endSec: 42 });
  });

  it("enforces a minimum segment length", () => {
    const result = normalizeTrimWindow(10, 9.95, 10, 0.2);
    expect(result.endSec - result.startSec).toBeGreaterThanOrEqual(0.2 - 1e-9);
    expect(result.endSec).toBeLessThanOrEqual(10);
    expect(result.startSec).toBeGreaterThanOrEqual(0);
  });

  it("returns full range when audio is shorter than min segment", () => {
    expect(normalizeTrimWindow(0.1, 0.05, 0.06, 0.2)).toEqual({ startSec: 0, endSec: 0.1 });
  });

  it("formats trim clock labels", () => {
    expect(formatTrimClock(0)).toBe("0:00");
    expect(formatTrimClock(61.8)).toBe("1:01");
    expect(formatTrimClock(Number.NaN)).toBe("0:00");
  });
});
