import { describe, expect, it } from "vitest";
import {
  estimateTelemetryPayloadBytes,
  evaluateRecorderTelemetryBudget,
} from "./recorderTelemetryBudget";

describe("recorderTelemetryBudget", () => {
  it("estimates payload size in bytes", () => {
    const size = estimateTelemetryPayloadBytes({ waveformPeaks: [0.1, 0.2, 0.3] });
    expect(size).toBeGreaterThan(0);
  });

  it("returns ok when rate and payload are within budget", () => {
    const result = evaluateRecorderTelemetryBudget(
      {
        eventIntervalMs: 200,
        maxEventRateHz: 8,
        maxPayloadBytes: 4096,
        waveformBins: 48,
        estimatedPayloadBytes: 1024,
      },
      {
        eventCount: 20,
        windowMs: 5000,
        maxPayloadBytes: 900,
      }
    );
    expect(result.status).toBe("ok");
    expect(result.violations).toEqual([]);
  });

  it("returns warn when either budget is exceeded", () => {
    const result = evaluateRecorderTelemetryBudget(
      {
        eventIntervalMs: 200,
        maxEventRateHz: 8,
        maxPayloadBytes: 4096,
        waveformBins: 48,
        estimatedPayloadBytes: 1024,
      },
      {
        eventCount: 100,
        windowMs: 5000,
        maxPayloadBytes: 5000,
      }
    );
    expect(result.status).toBe("warn");
    expect(result.violations).toContain("event_rate");
    expect(result.violations).toContain("payload_size");
  });
});
