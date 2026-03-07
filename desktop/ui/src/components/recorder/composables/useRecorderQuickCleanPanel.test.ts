import { reactive } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { RecorderQuickCleanPanelEmit, RecorderQuickCleanPanelProps } from "./quickClean/quickClean.types";
import { useRecorderQuickCleanPanel } from "./useRecorderQuickCleanPanel";

function props(overrides: Partial<RecorderQuickCleanPanelProps> = {}): RecorderQuickCleanPanelProps {
  return {
    transcriptText: "Line 1",
    rawTranscriptSegments: [],
    sourceDurationSec: 60,
    hasTranscript: true,
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
    reviewState: "review_transcript_ready",
    reviewCta: {
      labelKey: "audio.review_cta_analyze",
      actionName: "analyze",
      disabled: false,
      progressPercent: null,
    },
    canAnalyze: true,
    hasAnalysisResult: false,
    ...overrides,
  };
}

describe("useRecorderQuickCleanPanel", () => {
  it("maps CTA action names to panel emit events", () => {
    const emit = vi.fn() as unknown as RecorderQuickCleanPanelEmit;
    const panelProps = reactive(props());
    const panel = useRecorderQuickCleanPanel({
      props: panelProps,
      emit,
      t: (key) => key,
    });

    panelProps.reviewCta.actionName = "transcribe";
    panel.handlePrimaryCta();
    panelProps.reviewCta.actionName = "analyze";
    panel.handlePrimaryCta();
    panelProps.reviewCta.actionName = "view_feedback";
    panel.handlePrimaryCta();
    panelProps.reviewCta.actionName = "export_fallback";
    panel.handlePrimaryCta();

    expect(emit).toHaveBeenCalledWith("transcribe");
    expect(emit).toHaveBeenCalledWith("analyze");
    expect(emit).toHaveBeenCalledWith("viewFeedback");
    expect(emit).toHaveBeenCalledWith("continue");
  });

  it("exposes quick-clean state and transcript workspace visibility by review state", () => {
    const emit = vi.fn() as unknown as RecorderQuickCleanPanelEmit;
    const panelProps = reactive(props({ reviewState: "review_no_transcript" }));
    const panel = useRecorderQuickCleanPanel({
      props: panelProps,
      emit,
      t: (key) => key,
    });

    expect(panel.showTranscriptWorkspace.value).toBe(false);
    panelProps.reviewState = "review_transcript_ready";
    expect(panel.showTranscriptWorkspace.value).toBe(true);
    panelProps.reviewState = "review_analysis_ready";
    expect(panel.showTranscriptWorkspace.value).toBe(true);

    expect(panel.AUDIENCE_OPTIONS).toContain("other");
    expect(panel.GOAL_OPTIONS).toContain("inspire");
    expect(panel.audioPreviewRef.value).toBeNull();
    expect(typeof panel.formatTimelineClock).toBe("function");
  });
});
