import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import { applyTrim } from "./audioRecorderCaptureTrim";

const trimMocks = vi.hoisted(() => ({
  recordRecorderHealthEvent: vi.fn(),
  audioTrimWav: vi.fn(),
  refreshTranscribeReadiness: vi.fn(),
  resolveRecorderHealthErrorCode: vi.fn(),
}));

vi.mock("@/lib/recorderHealthMetrics", () => ({
  recordRecorderHealthEvent: trimMocks.recordRecorderHealthEvent,
}));

vi.mock("@/domains/recorder/api", () => ({
  audioTrimWav: trimMocks.audioTrimWav,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderCaptureReadiness", () => ({
  refreshTranscribeReadiness: trimMocks.refreshTranscribeReadiness,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderCaptureUtils", () => ({
  resolveRecorderHealthErrorCode: trimMocks.resolveRecorderHealthErrorCode,
}));

function createDeps(
  overrides: Partial<{
    activeProfileId: string | null;
    lastArtifactId: string | null;
    isApplyingTrim: boolean;
  }> = {}
) {
  const activeProfileId =
    "activeProfileId" in overrides ? (overrides.activeProfileId ?? null) : "profile-1";
  const lastArtifactId =
    "lastArtifactId" in overrides ? (overrides.lastArtifactId ?? null) : "artifact-1";
  const isApplyingTrim = "isApplyingTrim" in overrides ? (overrides.isApplyingTrim ?? false) : false;

  return {
    t: (key: string) => key,
    clearError: vi.fn(),
    setError: vi.fn(),
    emit: vi.fn(),
    announce: vi.fn(),
    resetTranscriptionState: vi.fn(),
    activeProfileId: ref<string | null>(activeProfileId),
    lastArtifactId: ref<string | null>(lastArtifactId),
    isApplyingTrim: ref(isApplyingTrim),
    lastSavedPath: ref<string | null>(null),
    lastDurationSec: ref<number | null>(null),
    lastWaveformPeaks: ref<number[]>([0.1, 0.2]),
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderCaptureTrim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips trim when profile/artifact context is missing or trim is already in progress", async () => {
    await applyTrim(createDeps({ activeProfileId: null }), { startMs: 0, endMs: 1000 });
    await applyTrim(createDeps({ lastArtifactId: null }), { startMs: 0, endMs: 1000 });
    await applyTrim(createDeps({ isApplyingTrim: true }), { startMs: 0, endMs: 1000 });

    expect(trimMocks.audioTrimWav).not.toHaveBeenCalled();
  });

  it("applies trim and updates saved artifact state", async () => {
    const deps = createDeps();
    trimMocks.audioTrimWav.mockResolvedValue({
      path: "C:/tmp/trimmed.wav",
      artifactId: "artifact-2",
      durationMs: 4200,
    });
    trimMocks.refreshTranscribeReadiness.mockResolvedValue(undefined);

    await applyTrim(deps, { startMs: 100, endMs: 2000 });

    expect(trimMocks.audioTrimWav).toHaveBeenCalledWith({
      profileId: "profile-1",
      audioArtifactId: "artifact-1",
      startMs: 100,
      endMs: 2000,
    });
    expect(deps.lastSavedPath.value).toBe("C:/tmp/trimmed.wav");
    expect(deps.lastArtifactId.value).toBe("artifact-2");
    expect(deps.lastDurationSec.value).toBe(4.2);
    expect(deps.lastWaveformPeaks.value).toEqual([]);
    expect(deps.resetTranscriptionState).toHaveBeenCalled();
    expect(deps.emit).toHaveBeenCalledWith("saved", {
      artifactId: "artifact-2",
      path: "C:/tmp/trimmed.wav",
    });
    expect(deps.announce).toHaveBeenCalledWith("audio.quick_clean_trim_applied");
    expect(trimMocks.refreshTranscribeReadiness).toHaveBeenCalledWith(deps);
    expect(trimMocks.recordRecorderHealthEvent).toHaveBeenCalledWith("trim_success");
    expect(deps.isApplyingTrim.value).toBe(false);
  });

  it("reports trim failures and records failure health metric", async () => {
    const deps = createDeps();
    trimMocks.audioTrimWav.mockRejectedValue(new Error("trim failed"));
    trimMocks.resolveRecorderHealthErrorCode.mockReturnValue("trim_error");

    await applyTrim(deps, { startMs: 100, endMs: 2000 });

    expect(deps.setError).toHaveBeenCalledWith("trim failed");
    expect(trimMocks.recordRecorderHealthEvent).toHaveBeenCalledWith("trim_failure", {
      errorCode: "trim_error",
    });
    expect(deps.isApplyingTrim.value).toBe(false);
  });
});
