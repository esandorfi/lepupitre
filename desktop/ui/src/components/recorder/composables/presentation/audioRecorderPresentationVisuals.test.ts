import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { AudioRecorderState } from "@/components/recorder/composables/useAudioRecorderState";
import type { UiSettings } from "@/lib/uiPreferences";
import { createVisualPresentation } from "./audioRecorderPresentationVisuals";

const visualsMocks = vi.hoisted(() => ({
  convertFileSrc: vi.fn((path: string) => `tauri://${path}`),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: visualsMocks.convertFileSrc,
}));

function state(overrides: Partial<AudioRecorderState> = {}): AudioRecorderState {
  return {
    qualityHintKey: ref("good_level"),
    isRecording: ref(false),
    isPaused: ref(false),
    activeProfileId: computed(() => "profile-1"),
    isStarting: ref(false),
    statusKey: ref("audio.status_idle"),
    recordingId: ref<string | null>(null),
    lastSavedPath: ref<string | null>(null),
    telemetryBudget: ref(null),
    telemetryEventCount: ref(0),
    telemetryWindowStartMs: ref<number | null>(null),
    telemetryMaxPayloadBytes: ref(0),
    liveSegments: ref([]),
    livePartial: ref<string | null>(null),
    ...overrides,
  } as unknown as AudioRecorderState;
}

function uiSettings(waveformStyle: UiSettings["waveformStyle"]) {
  return ref({
    primaryNavMode: "sidebar-icon",
    sidebarPinned: false,
    onboardingSeen: false,
    gamificationMode: "balanced",
    mascotEnabled: true,
    mascotIntensity: "contextual",
    waveformStyle,
  } as UiSettings);
}

describe("audioRecorderPresentationVisuals", () => {
  it("derives quality/capture controls and live preview lines", () => {
    const recorderState = state({
      qualityHintKey: ref("too_loud"),
      isRecording: ref(true),
      isPaused: ref(false),
      recordingId: ref("rec-1"),
      liveSegments: ref([
        { t_start_ms: 0, t_end_ms: 1000, text: "First line" },
        { t_start_ms: 1000, t_end_ms: 2000, text: "Second line" },
      ]),
      livePartial: ref("partial"),
    });
    const presentation = createVisualPresentation({
      state: recorderState,
      t: (key) => key,
      uiSettings: uiSettings("spark"),
      canAnalyze: ref(false),
      hasAnalysisResult: ref(false),
    });

    expect(presentation.waveformStyle.value).toBe("spark");
    expect(presentation.qualityGuidanceMessages.value).toEqual([
      "audio.calibration_loud_1",
      "audio.calibration_loud_2",
    ]);
    expect(presentation.qualityLabel.value).toBe("audio.quality_too_loud");
    expect(presentation.qualityTone.value).toBe("danger");
    expect(presentation.recBadgeLabel.value).toBe("audio.rec_badge");
    expect(presentation.showRecBadge.value).toBe(true);

    expect(presentation.capturePrimaryAction.value).toBe("pause");
    expect(presentation.capturePrimaryLabel.value).toBe("audio.pause");
    expect(presentation.captureCanPrimary.value).toBe(true);
    expect(presentation.captureCanStop.value).toBe(true);

    expect(presentation.livePreviewLines.value).toEqual({
      previous: "First line",
      current: "Second line partial",
    });
  });

  it("builds audio preview sources and telemetry summaries from recorder state", () => {
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(2_000);
    const recorderState = state({
      lastSavedPath: ref("C:\\recordings\\take 1.wav"),
      telemetryBudget: ref({
        eventIntervalMs: 100,
        maxEventRateHz: 10,
        maxPayloadBytes: 100,
        waveformBins: 16,
        estimatedPayloadBytes: 32,
      }),
      telemetryEventCount: ref(5),
      telemetryWindowStartMs: ref(1_000),
      telemetryMaxPayloadBytes: ref(50),
      statusKey: ref("audio.status_encoding"),
      activeProfileId: computed(() => null),
      recordingId: ref<string | null>(null),
    });
    const presentation = createVisualPresentation({
      state: recorderState,
      t: (key) => key,
      uiSettings: uiSettings("timeline"),
      canAnalyze: ref(false),
      hasAnalysisResult: ref(false),
    });

    expect(presentation.audioPreviewSources.value).toEqual([
      "file:///C:/recordings/take%201.wav",
      "tauri://C:\\recordings\\take 1.wav",
    ]);
    expect(visualsMocks.convertFileSrc).toHaveBeenCalledWith("C:\\recordings\\take 1.wav");
    expect(presentation.telemetryBudgetSummary.value).toBe("audio.telemetry_budget_ok: 5.0 evt/s, 50 B");

    recorderState.telemetryEventCount.value = 40;
    recorderState.telemetryMaxPayloadBytes.value = 150;
    expect(presentation.telemetryBudgetSummary.value).toBe("audio.telemetry_budget_warn: 40.0 evt/s, 150 B");

    expect(presentation.capturePrimaryAction.value).toBe("start");
    expect(presentation.capturePrimaryLabel.value).toBe("audio.start");
    expect(presentation.captureCanPrimary.value).toBe(false);
    expect(presentation.captureCanStop.value).toBe(false);

    dateNowSpy.mockRestore();
  });
});
