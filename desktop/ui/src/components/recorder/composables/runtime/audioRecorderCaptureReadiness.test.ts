import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptionSettings } from "@/lib/transcriptionSettings";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import {
  refreshInputDevices,
  refreshStatus,
  refreshTelemetryBudget,
  refreshTranscribeReadiness,
} from "./audioRecorderCaptureReadiness";

const readinessMocks = vi.hoisted(() => ({
  classifyAsrError: vi.fn(),
  asrSidecarStatus: vi.fn(),
  asrModelVerify: vi.fn(),
  listRecordingInputDevices: vi.fn(),
  recordingStatus: vi.fn(),
  recordingTelemetryBudget: vi.fn(),
  applyQualityHint: vi.fn(),
}));

vi.mock("@/lib/asrErrors", () => ({
  classifyAsrError: readinessMocks.classifyAsrError,
}));

vi.mock("@/domains/asr/api", () => ({
  asrSidecarStatus: readinessMocks.asrSidecarStatus,
  asrModelVerify: readinessMocks.asrModelVerify,
}));

vi.mock("@/domains/recorder/api", () => ({
  listRecordingInputDevices: readinessMocks.listRecordingInputDevices,
  recordingStatus: readinessMocks.recordingStatus,
  recordingTelemetryBudget: readinessMocks.recordingTelemetryBudget,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderCaptureUtils", () => ({
  applyQualityHint: readinessMocks.applyQualityHint,
}));

function createDeps(
  overrides: Partial<{
    recordingId: string | null;
    selectedInputDeviceId: string | null;
    model: string | null;
  }> = {}
) {
  const recordingId = "recordingId" in overrides ? (overrides.recordingId ?? null) : "rec-1";
  const selectedInputDeviceId =
    "selectedInputDeviceId" in overrides ? (overrides.selectedInputDeviceId ?? null) : null;
  const model = "model" in overrides ? overrides.model : "tiny";

  return {
    t: (key: string) => key,
    setError: vi.fn(),
    clearError: vi.fn(),
    updateNoSignalAutoStop: vi.fn(),
    recordingId: ref<string | null>(recordingId),
    liveDurationSec: ref(0),
    liveLevel: ref(0),
    isPaused: ref(false),
    transcribeBlockedCode: ref<string | null>(null),
    transcribeBlockedMessage: ref<string | null>(null),
    transcriptionSettings: ref({ model } as TranscriptionSettings),
    isLoadingInputDevices: ref(false),
    inputDevices: ref<Array<{ id: string; isDefault?: boolean }>>([]),
    selectedInputDeviceId: ref<string | null>(selectedInputDeviceId),
    telemetryBudget: ref<unknown | null>(null),
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderCaptureReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes recording status and applies quality hint", async () => {
    const deps = createDeps({ recordingId: "rec-1" });
    readinessMocks.recordingStatus.mockResolvedValue({
      durationMs: 2400,
      level: 0.42,
      isPaused: true,
      qualityHintKey: "ok",
    });

    await refreshStatus(deps);

    expect(readinessMocks.recordingStatus).toHaveBeenCalledWith("rec-1");
    expect(deps.liveDurationSec.value).toBe(2.4);
    expect(deps.liveLevel.value).toBe(0.42);
    expect(deps.isPaused.value).toBe(true);
    expect(readinessMocks.applyQualityHint).toHaveBeenCalledWith(deps, "ok");
    expect(deps.updateNoSignalAutoStop).toHaveBeenCalled();
  });

  it("ignores stale status response after recording id changes", async () => {
    const deps = createDeps({ recordingId: "rec-1" });
    readinessMocks.recordingStatus.mockImplementation(async () => {
      deps.recordingId.value = "rec-2";
      return {
        durationMs: 5000,
        level: 0.9,
        isPaused: false,
        qualityHintKey: "warn",
      };
    });

    await refreshStatus(deps);

    expect(deps.liveDurationSec.value).toBe(0);
    expect(readinessMocks.applyQualityHint).not.toHaveBeenCalled();
    expect(deps.setError).not.toHaveBeenCalled();
  });

  it("marks sidecar or model issues as transcribe-blocking", async () => {
    const sidecarDeps = createDeps();
    readinessMocks.asrSidecarStatus.mockRejectedValueOnce(new Error("sidecar missing"));
    readinessMocks.classifyAsrError.mockReturnValueOnce("sidecar_missing");

    await refreshTranscribeReadiness(sidecarDeps);

    expect(sidecarDeps.clearError).toHaveBeenCalled();
    expect(sidecarDeps.transcribeBlockedCode.value).toBe("sidecar_missing");
    expect(sidecarDeps.transcribeBlockedMessage.value).toBe("audio.error_sidecar_missing");

    const modelDeps = createDeps({ model: "base" });
    readinessMocks.asrSidecarStatus.mockResolvedValueOnce(undefined);
    readinessMocks.asrModelVerify.mockResolvedValueOnce({ installed: false, checksum_ok: false });

    await refreshTranscribeReadiness(modelDeps);

    expect(readinessMocks.asrModelVerify).toHaveBeenCalledWith("base");
    expect(modelDeps.transcribeBlockedCode.value).toBe("model_missing");
    expect(modelDeps.transcribeBlockedMessage.value).toBe("audio.error_model_missing");
  });

  it("loads input devices and keeps a valid user selection", async () => {
    const deps = createDeps({ selectedInputDeviceId: "mic-2" });
    readinessMocks.listRecordingInputDevices.mockResolvedValue([
      { id: "mic-1", isDefault: true },
      { id: "mic-2", isDefault: false },
    ]);

    await refreshInputDevices(deps);
    expect(deps.selectedInputDeviceId.value).toBe("mic-2");
    expect(deps.isLoadingInputDevices.value).toBe(false);

    const fallbackDeps = createDeps({ selectedInputDeviceId: "missing" });
    readinessMocks.listRecordingInputDevices.mockResolvedValueOnce([
      { id: "mic-3", isDefault: false },
      { id: "mic-4", isDefault: true },
    ]);

    await refreshInputDevices(fallbackDeps);
    expect(fallbackDeps.selectedInputDeviceId.value).toBe("mic-4");
  });

  it("refreshes telemetry budget and falls back to null on failures", async () => {
    const deps = createDeps();
    readinessMocks.recordingTelemetryBudget.mockResolvedValue({ remaining: 100 });
    await refreshTelemetryBudget(deps);
    expect(deps.telemetryBudget.value).toEqual({ remaining: 100 });

    readinessMocks.recordingTelemetryBudget.mockRejectedValueOnce(new Error("budget error"));
    await refreshTelemetryBudget(deps);
    expect(deps.telemetryBudget.value).toBeNull();
  });
});
