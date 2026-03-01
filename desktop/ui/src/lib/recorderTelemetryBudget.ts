export type RecorderTelemetryBudget = {
  eventIntervalMs: number;
  maxEventRateHz: number;
  maxPayloadBytes: number;
  waveformBins: number;
  estimatedPayloadBytes: number;
};

export type RecorderTelemetryObservation = {
  eventCount: number;
  windowMs: number;
  maxPayloadBytes: number;
};

export type RecorderTelemetryBudgetEvaluation = {
  status: "ok" | "warn" | "unknown";
  eventsPerSecond: number;
  maxPayloadBytes: number;
  violations: Array<"event_rate" | "payload_size">;
};

export function estimateTelemetryPayloadBytes(payload: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).length;
  } catch {
    return 0;
  }
}

export function evaluateRecorderTelemetryBudget(
  budget: RecorderTelemetryBudget | null,
  observation: RecorderTelemetryObservation
): RecorderTelemetryBudgetEvaluation {
  if (!budget || observation.eventCount <= 0 || observation.windowMs <= 0) {
    return {
      status: "unknown",
      eventsPerSecond: 0,
      maxPayloadBytes: observation.maxPayloadBytes,
      violations: [],
    };
  }

  const eventsPerSecond = (observation.eventCount * 1000) / observation.windowMs;
  const violations: Array<"event_rate" | "payload_size"> = [];
  if (eventsPerSecond > budget.maxEventRateHz) {
    violations.push("event_rate");
  }
  if (observation.maxPayloadBytes > budget.maxPayloadBytes) {
    violations.push("payload_size");
  }

  return {
    status: violations.length > 0 ? "warn" : "ok",
    eventsPerSecond,
    maxPayloadBytes: observation.maxPayloadBytes,
    violations,
  };
}
