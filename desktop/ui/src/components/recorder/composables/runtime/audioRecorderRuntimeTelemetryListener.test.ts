import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import { createAudioRecorderCleanupSet } from "./audioRecorderRuntimeListenerTypes";
import { registerRecordingTelemetryListener } from "./audioRecorderRuntimeTelemetryListener";

const telemetryListenerMocks = vi.hoisted(() => ({
  listen: vi.fn(),
  applyQualityHint: vi.fn(),
  peaksChanged: vi.fn(),
  registerTelemetryObservation: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: telemetryListenerMocks.listen,
}));

vi.mock("@/components/recorder/composables/audioRecorderCaptureRuntime", () => ({
  applyQualityHint: telemetryListenerMocks.applyQualityHint,
  peaksChanged: telemetryListenerMocks.peaksChanged,
  registerTelemetryObservation: telemetryListenerMocks.registerTelemetryObservation,
}));

type EventHandler = (event: { payload: unknown }) => void;

function setupListenRegistry() {
  const handlers: Record<string, EventHandler> = {};
  telemetryListenerMocks.listen.mockImplementation(async (eventName: string, handler: EventHandler) => {
    handlers[eventName] = handler;
    return vi.fn();
  });
  return handlers;
}

function createDeps() {
  return {
    recordingId: ref<string | null>("rec-1"),
    telemetryReceived: ref(false),
    clearTelemetryFallbackTimer: vi.fn(),
    clearStatusTimer: vi.fn(),
    liveDurationSec: ref(0),
    liveLevel: ref(0),
    liveWaveformPeaks: ref<number[]>([0.1, 0.2]),
    updateNoSignalAutoStop: vi.fn(),
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderRuntimeTelemetryListener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates runtime telemetry state from valid telemetry events", async () => {
    const handlers = setupListenRegistry();
    const deps = createDeps();
    const cleanups = createAudioRecorderCleanupSet();
    telemetryListenerMocks.peaksChanged.mockReturnValue(true);

    await registerRecordingTelemetryListener(() => deps, cleanups);

    handlers["recording/telemetry/v1"]?.({
      payload: {
        schemaVersion: "1.0.0",
        durationMs: 1500,
        level: 0.7,
        isClipping: false,
        signalPresent: true,
        qualityHintKey: "good_level",
        waveformPeaks: [0.3, 0.4],
      },
    });

    expect(deps.telemetryReceived.value).toBe(true);
    expect(deps.clearTelemetryFallbackTimer).toHaveBeenCalled();
    expect(deps.clearStatusTimer).toHaveBeenCalled();
    expect(deps.liveDurationSec.value).toBe(1.5);
    expect(deps.liveLevel.value).toBe(0.7);
    expect(deps.liveWaveformPeaks.value).toEqual([0.3, 0.4]);
    expect(telemetryListenerMocks.applyQualityHint).toHaveBeenCalledWith(deps, "good_level");
    expect(deps.updateNoSignalAutoStop).toHaveBeenCalled();
    expect(telemetryListenerMocks.registerTelemetryObservation).toHaveBeenCalled();
  });

  it("ignores invalid payloads or missing recording context", async () => {
    const handlers = setupListenRegistry();
    const deps = createDeps();
    const cleanups = createAudioRecorderCleanupSet();
    deps.recordingId.value = null;

    await registerRecordingTelemetryListener(() => deps, cleanups);

    handlers["recording/telemetry/v1"]?.({
      payload: {
        schemaVersion: "1.0.0",
        durationMs: 1500,
        level: 0.7,
        isClipping: false,
        signalPresent: true,
        qualityHintKey: "good_level",
        waveformPeaks: [0.3, 0.4],
      },
    });

    handlers["recording/telemetry/v1"]?.({ payload: { invalid: true } });
    expect(deps.telemetryReceived.value).toBe(false);
    expect(telemetryListenerMocks.applyQualityHint).not.toHaveBeenCalled();
    expect(telemetryListenerMocks.registerTelemetryObservation).not.toHaveBeenCalled();
  });
});
