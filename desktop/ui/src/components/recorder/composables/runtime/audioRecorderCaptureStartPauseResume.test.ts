import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptionSettings } from "@/lib/transcriptionSettings";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import {
  pauseRecording,
  resumeRecording,
  startRecording,
} from "./audioRecorderCaptureStartPauseResume";

const startPauseResumeMocks = vi.hoisted(() => ({
  buildRecordingStartPayload: vi.fn(),
  recordRecorderHealthEvent: vi.fn(),
  recordingStart: vi.fn(),
  recordingPause: vi.fn(),
  recordingResume: vi.fn(),
  resetLiveTranscript: vi.fn(),
  resetQualityHintState: vi.fn(),
  resetTelemetryObservation: vi.fn(),
  resolveRecorderHealthErrorCode: vi.fn(),
}));

vi.mock("@/lib/asrPayloads", () => ({
  buildRecordingStartPayload: startPauseResumeMocks.buildRecordingStartPayload,
}));

vi.mock("@/lib/recorderHealthMetrics", () => ({
  recordRecorderHealthEvent: startPauseResumeMocks.recordRecorderHealthEvent,
}));

vi.mock("@/domains/recorder/api", () => ({
  recordingStart: startPauseResumeMocks.recordingStart,
  recordingPause: startPauseResumeMocks.recordingPause,
  recordingResume: startPauseResumeMocks.recordingResume,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderCaptureUtils", () => ({
  resetLiveTranscript: startPauseResumeMocks.resetLiveTranscript,
  resetQualityHintState: startPauseResumeMocks.resetQualityHintState,
  resetTelemetryObservation: startPauseResumeMocks.resetTelemetryObservation,
  resolveRecorderHealthErrorCode: startPauseResumeMocks.resolveRecorderHealthErrorCode,
}));

function createDeps(
  overrides: Partial<{
    isStarting: boolean;
    activeProfileId: string | null;
    recordingId: string | null;
    isRecording: boolean;
    isPaused: boolean;
  }> = {}
) {
  const isStarting = "isStarting" in overrides ? (overrides.isStarting ?? false) : false;
  const activeProfileId =
    "activeProfileId" in overrides ? (overrides.activeProfileId ?? null) : "profile-1";
  const recordingId = "recordingId" in overrides ? (overrides.recordingId ?? null) : null;
  const isRecording = "isRecording" in overrides ? (overrides.isRecording ?? false) : false;
  const isPaused = "isPaused" in overrides ? (overrides.isPaused ?? false) : false;

  return {
    t: (key: string) => key,
    clearError: vi.fn(),
    setError: vi.fn(),
    announce: vi.fn(),
    applyTransport: vi.fn(),
    clearStatusTimer: vi.fn(),
    armStatusPollingFallback: vi.fn(),
    resetTranscriptionState: vi.fn(),
    activeProfileId: ref(activeProfileId),
    isStarting: ref(isStarting),
    recordingId: ref<string | null>(recordingId),
    isRecording: ref(isRecording),
    isPaused: ref(isPaused),
    transcriptionSettings: ref({} as TranscriptionSettings),
    selectedInputDeviceId: ref<string | null>("mic-1"),
    lastSavedPath: ref<string | null>("C:/tmp/prev.wav"),
    lastArtifactId: ref<string | null>("artifact-prev"),
    lastDurationSec: ref<number | null>(120),
    liveDurationSec: ref(12),
    liveLevel: ref(0.4),
    statusKey: ref("audio.status_idle"),
    phase: ref("quick_clean"),
    liveWaveformPeaks: ref([1, 2, 3]),
    lastWaveformPeaks: ref([4, 5, 6]),
    telemetryReceived: ref(true),
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderCaptureStartPauseResume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not start when a start request is already in progress", async () => {
    const deps = createDeps({ isStarting: true });

    await startRecording(deps);

    expect(startPauseResumeMocks.recordingStart).not.toHaveBeenCalled();
  });

  it("requires an active profile before starting capture", async () => {
    const deps = createDeps({ activeProfileId: null });

    await startRecording(deps);

    expect(deps.setError).toHaveBeenCalledWith("audio.profile_required");
    expect(deps.isStarting.value).toBe(false);
    expect(startPauseResumeMocks.recordingStart).not.toHaveBeenCalled();
  });

  it("starts recording and applies capture runtime state transitions", async () => {
    const deps = createDeps({ activeProfileId: "profile-1" });
    startPauseResumeMocks.buildRecordingStartPayload.mockReturnValue({ payload: "start" });
    startPauseResumeMocks.recordingStart.mockResolvedValue({ recordingId: "rec-1" });

    await startRecording(deps);

    expect(startPauseResumeMocks.buildRecordingStartPayload).toHaveBeenCalledWith(
      "profile-1",
      deps.transcriptionSettings.value,
      "mic-1"
    );
    expect(startPauseResumeMocks.recordingStart).toHaveBeenCalledWith({ payload: "start" });
    expect(deps.lastSavedPath.value).toBeNull();
    expect(deps.lastArtifactId.value).toBeNull();
    expect(deps.lastDurationSec.value).toBeNull();
    expect(deps.liveDurationSec.value).toBe(0);
    expect(deps.liveLevel.value).toBe(0);
    expect(deps.phase.value).toBe("capture");
    expect(deps.statusKey.value).toBe("audio.status_recording");
    expect(deps.recordingId.value).toBe("rec-1");
    expect(deps.applyTransport).toHaveBeenCalledWith("start");
    expect(deps.armStatusPollingFallback).toHaveBeenCalledWith("rec-1");
    expect(deps.announce).toHaveBeenCalledWith("audio.announcement_started");
    expect(startPauseResumeMocks.recordRecorderHealthEvent).toHaveBeenCalledWith("start_success");
  });

  it("surfaces start failures and records failure metric", async () => {
    const deps = createDeps({ activeProfileId: "profile-1" });
    startPauseResumeMocks.buildRecordingStartPayload.mockReturnValue({ payload: "start" });
    startPauseResumeMocks.recordingStart.mockRejectedValue(new Error("mic unavailable"));
    startPauseResumeMocks.resolveRecorderHealthErrorCode.mockReturnValue("device_error");

    await startRecording(deps);

    expect(deps.setError).toHaveBeenCalledWith("mic unavailable");
    expect(deps.statusKey.value).toBe("audio.status_idle");
    expect(startPauseResumeMocks.recordRecorderHealthEvent).toHaveBeenCalledWith("start_failure", {
      errorCode: "device_error",
    });
    expect(deps.isStarting.value).toBe(false);
  });

  it("pauses and resumes only when transport state allows it", async () => {
    const pauseDeps = createDeps({ recordingId: "rec-1", isRecording: true });
    await pauseRecording(pauseDeps);
    expect(startPauseResumeMocks.recordingPause).toHaveBeenCalledWith("rec-1");
    expect(pauseDeps.applyTransport).toHaveBeenCalledWith("pause");
    expect(pauseDeps.announce).toHaveBeenCalledWith("audio.announcement_paused");

    const pausedDeps = createDeps({ recordingId: "rec-1", isPaused: true });
    await resumeRecording(pausedDeps);
    expect(startPauseResumeMocks.recordingResume).toHaveBeenCalledWith("rec-1");
    expect(pausedDeps.applyTransport).toHaveBeenCalledWith("resume");
    expect(pausedDeps.announce).toHaveBeenCalledWith("audio.announcement_resumed");

    const blockedPause = createDeps({ recordingId: null, isRecording: true });
    await pauseRecording(blockedPause);
    expect(blockedPause.applyTransport).not.toHaveBeenCalled();

    const blockedResume = createDeps({ recordingId: "rec-1", isPaused: false });
    await resumeRecording(blockedResume);
    expect(blockedResume.applyTransport).not.toHaveBeenCalled();
  });
});
