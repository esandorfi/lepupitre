import { nextTick, reactive } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { RecorderQuickCleanPanelEmit, RecorderQuickCleanPanelProps } from "./quickClean.types";
import { createTrimState } from "./quickClean.trim";

function props(overrides: Partial<RecorderQuickCleanPanelProps> = {}): RecorderQuickCleanPanelProps {
  return {
    transcriptText: "",
    rawTranscriptSegments: [],
    sourceDurationSec: 90,
    hasTranscript: false,
    isTranscribing: false,
    transcribeProgress: 0,
    transcribeStageLabel: null,
    canTranscribe: true,
    showTranscribeBlockedHint: false,
    transcribeBlockedMessage: null,
    isSavingEdited: false,
    canOpenOriginal: false,
    isRevealing: false,
    isApplyingTrim: false,
    canApplyTrim: true,
    audioPreviewSources: [],
    waveformPeaks: [],
    waveformStyle: "classic",
    reviewState: "review_no_transcript",
    reviewCta: {
      labelKey: "audio.review_cta_transcribe",
      actionName: "transcribe",
      disabled: false,
      progressPercent: null,
    },
    canAnalyze: false,
    hasAnalysisResult: false,
    ...overrides,
  };
}

describe("quickClean.trim", () => {
  it("initializes trim bounds from source duration and emits normalized windows", () => {
    const emit = vi.fn() as unknown as RecorderQuickCleanPanelEmit;
    const state = createTrimState(props(), emit);

    expect(state.trimStartSec.value).toBe(0);
    expect(state.trimEndSec.value).toBe(90);
    expect(state.trimDurationSec.value).toBe(90);
    expect(state.trimDirty.value).toBe(false);

    state.onTrimStartInput(10);
    state.onTrimEndInput(40);
    expect(state.trimStartSec.value).toBe(10);
    expect(state.trimEndSec.value).toBe(40);
    expect(state.trimDurationSec.value).toBe(30);
    expect(state.trimDirty.value).toBe(true);

    state.applyTrim();
    expect(emit).toHaveBeenCalledWith("applyTrim", { startMs: 10_000, endMs: 40_000 });
  });

  it("guards invalid/blocked trim actions and reacts to source-duration reset", async () => {
    const emit = vi.fn() as unknown as RecorderQuickCleanPanelEmit;
    const reactiveProps = reactive(props({ sourceDurationSec: 30 }));
    const state = createTrimState(reactiveProps, emit);

    state.onTrimStartInput(Number.NaN);
    state.onTrimEndInput(Number.NaN);
    expect(state.trimStartSec.value).toBe(0);
    expect(state.trimEndSec.value).toBe(30);

    state.onTrimStartInput(15);
    state.onTrimEndInput(10);
    expect(state.trimStartSec.value).toBe(10);
    expect(state.trimEndSec.value).toBe(15);

    reactiveProps.isApplyingTrim = true;
    state.applyTrim();
    expect(emit).not.toHaveBeenCalled();

    reactiveProps.isApplyingTrim = false;
    state.resetTrimWindow();
    expect(state.trimStartSec.value).toBe(0);
    expect(state.trimEndSec.value).toBe(30);
    expect(state.trimDirty.value).toBe(false);

    reactiveProps.sourceDurationSec = null;
    await nextTick();
    expect(state.trimStartSec.value).toBe(0);
    expect(state.trimEndSec.value).toBe(0);
  });
});
