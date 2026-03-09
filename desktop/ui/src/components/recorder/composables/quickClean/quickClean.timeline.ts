import { computed, type Ref } from "vue";
import {
  RAW_CHUNK_STEP_MS,
  TIMELINE_MARKER_STEP_MS,
  type RawTimelineChunk,
  type RecorderQuickCleanPanelProps,
  type TFunction,
  type TimelineMarker,
} from "@/components/recorder/composables/quickClean/quickClean.types";
import { createAnchorMapExporter } from "@/components/recorder/composables/quickClean/quickClean.anchorExport";
import {
  buildCleanTextAnchors,
  buildCleanTextLineAnchors,
  compactPreview,
} from "@/components/recorder/composables/quickClean/quickClean.timelineAnchors";

/**
 * Formats values for format timeline clock.
 */
export function formatTimelineClock(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Creates and returns the create timeline state contract.
 */
export function createTimelineState(
  props: RecorderQuickCleanPanelProps,
  t: TFunction,
  audioPreviewRef: Ref<HTMLAudioElement | null>
) {
  const rawTranscriptSegmentsSorted = computed(() => {
    return [...props.rawTranscriptSegments].sort((a, b) => a.t_start_ms - b.t_start_ms);
  });

  const rawTranscriptDurationMs = computed(() => {
    const lastSegment =
      rawTranscriptSegmentsSorted.value[rawTranscriptSegmentsSorted.value.length - 1] ?? null;
    const fromSegments = lastSegment?.t_end_ms ?? 0;
    const fromAudio = Math.round((props.sourceDurationSec ?? 0) * 1000);
    return Math.max(fromSegments, fromAudio, 0);
  });

  function resolveWindowText(startMs: number, endMs: number): string {
    return rawTranscriptSegmentsSorted.value
      .filter((segment) => segment.t_end_ms > startMs && segment.t_start_ms < endMs)
      .map((segment) => segment.text.trim())
      .filter((text) => text.length > 0)
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  const timelineMarkers = computed<TimelineMarker[]>(() => {
    if (!props.hasTranscript || rawTranscriptDurationMs.value <= 0) {
      return [];
    }

    const markers: TimelineMarker[] = [];
    for (let atMs = 0; atMs <= rawTranscriptDurationMs.value; atMs += TIMELINE_MARKER_STEP_MS) {
      const preview = resolveWindowText(atMs, atMs + RAW_CHUNK_STEP_MS);
      markers.push({
        atMs,
        label: formatTimelineClock(atMs),
        preview:
          preview.length > 0 ? compactPreview(preview) : t("audio.quick_clean_timeline_empty"),
      });
    }
    return markers;
  });

  const rawTimelineChunks = computed<RawTimelineChunk[]>(() => {
    if (!props.hasTranscript || rawTranscriptDurationMs.value <= 0) {
      return [];
    }

    const chunks: RawTimelineChunk[] = [];
    for (let startMs = 0; startMs < rawTranscriptDurationMs.value; startMs += RAW_CHUNK_STEP_MS) {
      const endMs = Math.min(rawTranscriptDurationMs.value, startMs + RAW_CHUNK_STEP_MS);
      const text = resolveWindowText(startMs, endMs);
      if (!text) {
        continue;
      }
      chunks.push({ startMs, endMs, text });
    }
    return chunks;
  });

  const cleanTextLineAnchors = computed(() => {
    return buildCleanTextLineAnchors({
      transcriptText: props.transcriptText,
      hasTranscript: props.hasTranscript,
      chunks: rawTimelineChunks.value,
    });
  });

  const cleanTextAnchors = computed(() => {
    return buildCleanTextAnchors({
      transcriptText: props.transcriptText,
      hasTranscript: props.hasTranscript,
      chunks: rawTimelineChunks.value,
    });
  });

  function seekAudio(ms: number) {
    const audioElement = audioPreviewRef.value;
    if (!audioElement) {
      return;
    }
    audioElement.currentTime = Math.max(0, ms / 1000);
    if (audioElement.paused) {
      void audioElement.play().catch(() => undefined);
    }
  }

  function seekToCaretAnchor(event: Event) {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) {
      return;
    }
    const anchors = cleanTextLineAnchors.value;
    if (anchors.length === 0) {
      return;
    }
    const caretIndex = target.selectionStart ?? 0;
    const lineIndex = props.transcriptText.slice(0, caretIndex).split("\n").length - 1;
    const safeLineIndex = Math.max(0, Math.min(anchors.length - 1, lineIndex));
    const anchor = anchors[safeLineIndex];
    if (anchor) {
      seekAudio(anchor.startMs);
    }
  }

  const { anchorMapCopied, exportAnchorMapJson } = createAnchorMapExporter({
    props,
    rawTranscriptDurationMs,
    timelineMarkers,
    rawTimelineChunks,
    cleanTextAnchors,
  });

  return {
    timelineMarkers,
    rawTimelineChunks,
    cleanTextAnchors,
    seekToCaretAnchor,
    anchorMapCopied,
    exportAnchorMapJson,
    seekAudio,
  };
}
