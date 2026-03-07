import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import {
  formatDuration,
  levelPercent,
  mapStageToLabel,
  peaksChanged,
  registerTelemetryObservation,
  resetLiveTranscript,
  resetTelemetryObservation,
  resolveRecorderHealthErrorCode,
  transcriptToEditorText,
} from "./audioRecorderCaptureUtils";

const utilsMocks = vi.hoisted(() => ({
  classifyAsrError: vi.fn(),
  estimateTelemetryPayloadBytes: vi.fn(),
}));

vi.mock("@/lib/asrErrors", () => ({
  classifyAsrError: utilsMocks.classifyAsrError,
}));

vi.mock("@/lib/recorderTelemetryBudget", () => ({
  estimateTelemetryPayloadBytes: utilsMocks.estimateTelemetryPayloadBytes,
}));

function createDeps() {
  return {
    t: (key: string) => key,
    telemetryWindowStartMs: ref<number | null>(null),
    telemetryEventCount: ref(0),
    telemetryMaxPayloadBytes: ref(0),
    liveSegments: ref([{ text: "Hello" }]),
    livePartial: ref("partial"),
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderCaptureUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps stage labels from status message and stage", () => {
    const deps = createDeps();

    expect(mapStageToLabel(deps, "transcribe", "queued")).toBe("audio.stage_queued");
    expect(mapStageToLabel(deps, "transcribe", "analyze_audio")).toBe("audio.stage_analyze");
    expect(mapStageToLabel(deps, "transcribe", null)).toBe("audio.stage_transcribe");
    expect(mapStageToLabel(deps, "other", null)).toBe("audio.stage_processing");
    expect(mapStageToLabel(deps, null, null)).toBeNull();
  });

  it("formats durations and audio level percentages", () => {
    expect(formatDuration(null)).toBe("0:00");
    expect(formatDuration(Number.NaN)).toBe("0:00");
    expect(formatDuration(65.7)).toBe("1:05");
    expect(levelPercent(-1)).toBe(0);
    expect(levelPercent(0.5)).toBe(50);
    expect(levelPercent(2)).toBe(100);
  });

  it("normalizes transcript editing text and checks peak diffs", () => {
    const transcript = {
      segments: [{ text: " first " }, { text: "second" }, { text: " third " }],
    };
    expect(transcriptToEditorText(transcript as never)).toBe("first\nsecond\nthird");

    expect(peaksChanged([0.1, 0.2], [0.1, 0.2])).toBe(false);
    expect(peaksChanged([0.1, 0.2], [0.1, 0.25])).toBe(true);
    expect(peaksChanged([0.1], [0.1, 0.2])).toBe(true);
  });

  it("resolves recorder health error code from asr classifier or token pattern", () => {
    utilsMocks.classifyAsrError.mockReturnValueOnce("sidecar_missing");
    expect(resolveRecorderHealthErrorCode("any")).toBe("sidecar_missing");

    utilsMocks.classifyAsrError.mockReturnValueOnce(null);
    expect(resolveRecorderHealthErrorCode("Failure model_missing on device")).toBe("model_missing");

    utilsMocks.classifyAsrError.mockReturnValueOnce(null);
    expect(resolveRecorderHealthErrorCode("Unknown issue")).toBeNull();
  });

  it("resets and registers telemetry observation state", () => {
    const deps = createDeps();
    deps.telemetryWindowStartMs.value = 123;
    deps.telemetryEventCount.value = 5;
    deps.telemetryMaxPayloadBytes.value = 77;

    resetTelemetryObservation(deps);
    expect(deps.telemetryWindowStartMs.value).toBeNull();
    expect(deps.telemetryEventCount.value).toBe(0);
    expect(deps.telemetryMaxPayloadBytes.value).toBe(0);

    utilsMocks.estimateTelemetryPayloadBytes.mockReturnValueOnce(120);
    registerTelemetryObservation(deps, { payload: "first" });
    expect(deps.telemetryEventCount.value).toBe(1);
    expect(deps.telemetryMaxPayloadBytes.value).toBe(120);
    expect(deps.telemetryWindowStartMs.value).not.toBeNull();

    utilsMocks.estimateTelemetryPayloadBytes.mockReturnValueOnce(80);
    registerTelemetryObservation(deps, { payload: "second" });
    expect(deps.telemetryEventCount.value).toBe(2);
    expect(deps.telemetryMaxPayloadBytes.value).toBe(120);
  });

  it("resets live transcript preview state", () => {
    const deps = createDeps();

    resetLiveTranscript(deps);

    expect(deps.liveSegments.value).toEqual([]);
    expect(deps.livePartial.value).toBeNull();
  });
});
