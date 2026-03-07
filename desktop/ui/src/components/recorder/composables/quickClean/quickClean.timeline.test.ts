import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { RecorderQuickCleanPanelProps } from "./quickClean.types";
import { createTimelineState, formatTimelineClock } from "./quickClean.timeline";

function props(overrides: Partial<RecorderQuickCleanPanelProps> = {}): RecorderQuickCleanPanelProps {
  return {
    transcriptText: "Hello team\nVue patterns",
    rawTranscriptSegments: [
      { t_start_ms: 0, t_end_ms: 4_000, text: "Hello team" },
      { t_start_ms: 31_000, t_end_ms: 35_000, text: "Vue patterns" },
    ],
    sourceDurationSec: 65,
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

describe("quickClean.timeline", () => {
  it("formats timeline clocks and builds marker/chunk anchors from transcript segments", () => {
    expect(formatTimelineClock(0)).toBe("0:00");
    expect(formatTimelineClock(65_000)).toBe("1:05");

    const panelProps = props();
    const audioPreviewRef = ref<HTMLAudioElement | null>(null);
    const timeline = createTimelineState(panelProps, (key) => `i18n:${key}`, audioPreviewRef);

    expect(timeline.timelineMarkers.value.map((marker) => marker.atMs)).toEqual([0, 30_000, 60_000]);
    expect(timeline.timelineMarkers.value[0]?.preview).toContain("Hello team");
    expect(timeline.timelineMarkers.value[1]?.preview).toContain("Vue patterns");

    expect(timeline.rawTimelineChunks.value).toEqual([
      { startMs: 0, endMs: 10_000, text: "Hello team" },
      { startMs: 30_000, endMs: 40_000, text: "Vue patterns" },
    ]);

    expect(timeline.cleanTextAnchors.value).toEqual([
      { line: "Hello team", startMs: 0, endMs: 10_000 },
      { line: "Vue patterns", startMs: 30_000, endMs: 40_000 },
    ]);
  });

  it("seeks audio from direct commands and caret anchors", () => {
    const play = vi.fn(async () => undefined);
    const audio = { currentTime: 0, paused: true, play } as unknown as HTMLAudioElement;
    const panelProps = props();
    const audioPreviewRef = ref<HTMLAudioElement | null>(audio);
    const timeline = createTimelineState(panelProps, (key) => key, audioPreviewRef);

    timeline.seekAudio(2_500);
    expect(audio.currentTime).toBe(2.5);
    expect(play).toHaveBeenCalledTimes(1);

    const caretEvent = {
      target: {
        selectionStart: panelProps.transcriptText.indexOf("Vue"),
      },
    } as unknown as Event;
    timeline.seekToCaretAnchor(caretEvent);
    expect(audio.currentTime).toBe(30);
  });

  it("returns empty structures when transcript is unavailable", () => {
    const audioPreviewRef = ref<HTMLAudioElement | null>(null);
    const timeline = createTimelineState(
      props({
        hasTranscript: false,
        sourceDurationSec: null,
        rawTranscriptSegments: [],
        transcriptText: "",
      }),
      (key) => key,
      audioPreviewRef
    );

    expect(timeline.timelineMarkers.value).toEqual([]);
    expect(timeline.rawTimelineChunks.value).toEqual([]);
    expect(timeline.cleanTextAnchors.value).toEqual([]);
  });
});
