import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function createStorage(seed: Record<string, string> = {}): FakeStorage {
  const state = { ...seed };
  return {
    getItem: (key: string) => (key in state ? state[key] : null),
    setItem: (key: string, value: string) => {
      state[key] = String(value);
    },
    removeItem: (key: string) => {
      delete state[key];
    },
    clear: () => {
      for (const key of Object.keys(state)) {
        delete state[key];
      }
    },
  };
}

describe("recorderHealthMetrics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-02T10:00:00.000Z"));
    vi.resetModules();
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("starts with empty metrics", async () => {
    const { useRecorderHealthMetrics } = await import("./recorderHealthMetrics");
    const { metrics } = useRecorderHealthMetrics();
    expect(metrics.value.startSuccessCount).toBe(0);
    expect(metrics.value.transcribeFailureCount).toBe(0);
    expect(metrics.value.lastErrorCode).toBeNull();
  });

  it("tracks recorder events, daily counters, and error codes", async () => {
    const { recordRecorderHealthEvent, useRecorderHealthMetrics } = await import(
      "./recorderHealthMetrics"
    );
    const { metrics } = useRecorderHealthMetrics();

    recordRecorderHealthEvent("start_success");
    recordRecorderHealthEvent("stop_success");
    recordRecorderHealthEvent("transcribe_failure", { errorCode: "sidecar_missing" });

    expect(metrics.value.startSuccessCount).toBe(1);
    expect(metrics.value.stopSuccessCount).toBe(1);
    expect(metrics.value.transcribeFailureCount).toBe(1);
    expect(metrics.value.lastErrorCode).toBe("sidecar_missing");
    expect(metrics.value.errorsByCode.sidecar_missing).toBe(1);
    expect(metrics.value.daily["2026-03-02"]?.startSuccessCount).toBe(1);
    expect(metrics.value.daily["2026-03-02"]?.transcribeFailureCount).toBe(1);
  });

  it("resets recorder metrics", async () => {
    const {
      recordRecorderHealthEvent,
      resetRecorderHealthMetrics,
      useRecorderHealthMetrics,
    } = await import("./recorderHealthMetrics");
    const { metrics } = useRecorderHealthMetrics();

    recordRecorderHealthEvent("trim_failure", { errorCode: "unknown" });
    expect(metrics.value.trimFailureCount).toBe(1);
    expect(metrics.value.lastErrorCode).toBe("unknown");

    resetRecorderHealthMetrics();

    expect(metrics.value.trimFailureCount).toBe(0);
    expect(metrics.value.lastErrorCode).toBeNull();
    expect(Object.keys(metrics.value.daily)).toHaveLength(0);
  });
});
