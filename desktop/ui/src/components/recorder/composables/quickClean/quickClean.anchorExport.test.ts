import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecorderQuickCleanPanelProps } from "./quickClean.types";
import { createAnchorMapExporter } from "./quickClean.anchorExport";

function props(overrides: Partial<RecorderQuickCleanPanelProps> = {}): RecorderQuickCleanPanelProps {
  return {
    transcriptText: "Hello",
    rawTranscriptSegments: [],
    sourceDurationSec: 30,
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

describe("quickClean.anchorExport", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("copies anchor map JSON to clipboard and resets copied state after timeout", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => undefined);
    const previousNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      configurable: true,
      writable: true,
    });

    const exporter = createAnchorMapExporter({
      props: props(),
      rawTranscriptDurationMs: ref(30_000),
      timelineMarkers: ref([{ atMs: 0, label: "0:00", preview: "Hello" }]),
      rawTimelineChunks: ref([{ startMs: 0, endMs: 10_000, text: "Hello" }]),
      cleanTextAnchors: ref([{ line: "Hello", startMs: 0, endMs: 10_000 }]),
    });

    await exporter.exportAnchorMapJson();

    expect(writeText).toHaveBeenCalledTimes(1);
    const jsonPayload = (writeText.mock.calls[0] as string[] | undefined)?.[0];
    const payload = JSON.parse(jsonPayload ?? "{}") as { schemaVersion?: string };
    expect(payload.schemaVersion).toBe("1.0.0");
    expect(exporter.anchorMapCopied.value).toBe(true);

    vi.advanceTimersByTime(3_000);
    expect(exporter.anchorMapCopied.value).toBe(false);

    Object.defineProperty(globalThis, "navigator", {
      value: previousNavigator,
      configurable: true,
      writable: true,
    });
  });

  it("falls back to blob download when clipboard write fails", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("clipboard unavailable");
    });
    const previousNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      configurable: true,
      writable: true,
    });

    const click = vi.fn();
    const remove = vi.fn();
    const anchor = {
      href: "",
      download: "",
      style: { display: "" },
      click,
      remove,
    } as unknown as HTMLAnchorElement;
    const appendChild = vi.fn();
    const previousDocument = globalThis.document;
    Object.defineProperty(globalThis, "document", {
      value: {
        createElement: vi.fn(() => anchor),
        body: { appendChild },
      },
      configurable: true,
      writable: true,
    });

    const createObjectURL = vi.fn(() => "blob:anchor");
    const revokeObjectURL = vi.fn();
    const previousCreateObjectURL = URL.createObjectURL;
    const previousRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    const exporter = createAnchorMapExporter({
      props: props(),
      rawTranscriptDurationMs: ref(10_000),
      timelineMarkers: ref([]),
      rawTimelineChunks: ref([]),
      cleanTextAnchors: ref([]),
    });

    await exporter.exportAnchorMapJson();

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:anchor");

    URL.createObjectURL = previousCreateObjectURL;
    URL.revokeObjectURL = previousRevokeObjectURL;
    Object.defineProperty(globalThis, "navigator", {
      value: previousNavigator,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "document", {
      value: previousDocument,
      configurable: true,
      writable: true,
    });
  });

  it("does nothing when transcript is missing", async () => {
    const writeText = vi.fn(async () => undefined);
    const previousNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      configurable: true,
      writable: true,
    });

    const exporter = createAnchorMapExporter({
      props: props({ hasTranscript: false }),
      rawTranscriptDurationMs: ref(0),
      timelineMarkers: ref([]),
      rawTimelineChunks: ref([]),
      cleanTextAnchors: ref([]),
    });

    await exporter.exportAnchorMapJson();
    expect(writeText).not.toHaveBeenCalled();

    Object.defineProperty(globalThis, "navigator", {
      value: previousNavigator,
      configurable: true,
      writable: true,
    });
  });
});
