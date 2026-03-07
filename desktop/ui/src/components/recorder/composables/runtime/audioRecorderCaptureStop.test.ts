import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import { stopRecording } from "./audioRecorderCaptureStop";

const stopMocks = vi.hoisted(() => ({
  recordRecorderHealthEvent: vi.fn(),
  recordingStop: vi.fn(),
  refreshTranscribeReadiness: vi.fn(),
  resolveRecorderHealthErrorCode: vi.fn(),
}));

vi.mock("@/lib/recorderHealthMetrics", () => ({
  recordRecorderHealthEvent: stopMocks.recordRecorderHealthEvent,
}));

vi.mock("@/domains/recorder/api", () => ({
  recordingStop: stopMocks.recordingStop,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderCaptureReadiness", () => ({
  refreshTranscribeReadiness: stopMocks.refreshTranscribeReadiness,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderCaptureUtils", () => ({
  resolveRecorderHealthErrorCode: stopMocks.resolveRecorderHealthErrorCode,
}));

function createDeps(
  overrides: Partial<{
    recordingId: string | null;
    activeProfileId: string | null;
    statusKey: string;
    canTranscribe: boolean;
  }> = {}
) {
  const recordingId = "recordingId" in overrides ? (overrides.recordingId ?? null) : "rec-1";
  const activeProfileId =
    "activeProfileId" in overrides ? (overrides.activeProfileId ?? null) : "profile-1";
  const statusKey = "statusKey" in overrides ? (overrides.statusKey ?? "audio.status_recording") : "audio.status_recording";
  const canTranscribe = "canTranscribe" in overrides ? (overrides.canTranscribe ?? true) : true;

  return {
    t: (key: string) => key,
    emit: vi.fn(),
    setError: vi.fn(),
    announce: vi.fn(),
    applyTransport: vi.fn(),
    clearStatusTimer: vi.fn(),
    clearTelemetryFallbackTimer: vi.fn(),
    transcribeRecording: vi.fn(async () => {}),
    recordingId: ref<string | null>(recordingId),
    activeProfileId: ref<string | null>(activeProfileId),
    statusKey: ref(statusKey),
    lastSavedPath: ref<string | null>(null),
    lastArtifactId: ref<string | null>(null),
    lastDurationSec: ref<number | null>(null),
    liveWaveformPeaks: ref([0.1, 0.2, 0.3]),
    lastWaveformPeaks: ref<number[]>([]),
    liveLevel: ref(0.5),
    phase: ref("capture"),
    canTranscribe: ref(canTranscribe),
    telemetryReceived: ref(true),
    noSignalSinceMs: ref<number | null>(1000),
    isAutoStoppingNoSignal: ref(true),
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderCaptureStop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when stop preconditions are not met", async () => {
    await stopRecording(createDeps({ recordingId: null }));
    await stopRecording(createDeps({ activeProfileId: null }));
    await stopRecording(createDeps({ statusKey: "audio.status_encoding" }));

    expect(stopMocks.recordingStop).not.toHaveBeenCalled();
  });

  it("stops recording, saves artifact metadata and auto-transcribes when ready", async () => {
    const deps = createDeps({ canTranscribe: true });
    stopMocks.recordingStop.mockResolvedValue({
      path: "C:/tmp/recording.wav",
      artifactId: "artifact-1",
      durationMs: 3500,
    });
    stopMocks.refreshTranscribeReadiness.mockResolvedValue(undefined);

    await stopRecording(deps);
    await Promise.resolve();
    await Promise.resolve();

    expect(stopMocks.recordingStop).toHaveBeenCalledWith("profile-1", "rec-1");
    expect(deps.applyTransport).toHaveBeenCalledWith("stop");
    expect(deps.statusKey.value).toBe("audio.status_idle");
    expect(deps.lastSavedPath.value).toBe("C:/tmp/recording.wav");
    expect(deps.lastArtifactId.value).toBe("artifact-1");
    expect(deps.lastDurationSec.value).toBe(3.5);
    expect(deps.lastWaveformPeaks.value).toEqual([0.1, 0.2, 0.3]);
    expect(deps.phase.value).toBe("quick_clean");
    expect(deps.liveLevel.value).toBe(0);
    expect(deps.emit).toHaveBeenCalledWith("saved", {
      artifactId: "artifact-1",
      path: "C:/tmp/recording.wav",
    });
    expect(deps.transcribeRecording).toHaveBeenCalled();
    expect(stopMocks.recordRecorderHealthEvent).toHaveBeenCalledWith("stop_success");
    expect(deps.recordingId.value).toBeNull();
    expect(deps.telemetryReceived.value).toBe(false);
    expect(deps.noSignalSinceMs.value).toBeNull();
    expect(deps.isAutoStoppingNoSignal.value).toBe(false);
  });

  it("records stop failure and resets transport runtime state", async () => {
    const deps = createDeps();
    stopMocks.recordingStop.mockRejectedValue(new Error("stop failed"));
    stopMocks.resolveRecorderHealthErrorCode.mockReturnValue("stop_error");

    await stopRecording(deps);

    expect(deps.setError).toHaveBeenCalledWith("stop failed");
    expect(stopMocks.recordRecorderHealthEvent).toHaveBeenCalledWith("stop_failure", {
      errorCode: "stop_error",
    });
    expect(deps.statusKey.value).toBe("audio.status_idle");
    expect(deps.recordingId.value).toBeNull();
    expect(deps.telemetryReceived.value).toBe(false);
  });
});
