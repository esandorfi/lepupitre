import { computed, ref, type Ref } from "vue";
import {
  RAW_CHUNK_STEP_MS,
  TIMELINE_MARKER_STEP_MS,
  type CleanAnchor,
  type LineAnchor,
  type RawTimelineChunk,
  type RecorderQuickCleanPanelProps,
  type TFunction,
  type TimelineMarker,
} from "@/components/recorder/composables/quickClean/quickClean.types";

export function formatTimelineClock(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function compactPreview(value: string, max = 120): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max).trimEnd()}...`;
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function tokenOverlapScore(left: string, right: string): number {
  const leftTokens = normalizeTokens(left);
  const rightTokens = new Set(normalizeTokens(right));
  if (leftTokens.length === 0 || rightTokens.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / leftTokens.length;
}

function resolveChunkForLine(
  line: string,
  lineIndex: number,
  totalLines: number,
  chunks: RawTimelineChunk[]
): RawTimelineChunk {
  const fallbackIndex = Math.min(
    chunks.length - 1,
    Math.floor((lineIndex * chunks.length) / Math.max(totalLines, 1))
  );
  let bestIndex = fallbackIndex;
  let bestScore = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const score = tokenOverlapScore(line, chunks[chunkIndex]?.text ?? "");
    if (score > bestScore) {
      bestScore = score;
      bestIndex = chunkIndex;
    }
  }

  return chunks[bestIndex] ?? chunks[fallbackIndex]!;
}

function createAnchorMapExporter(options: {
  props: RecorderQuickCleanPanelProps;
  rawTranscriptDurationMs: Ref<number>;
  timelineMarkers: Ref<TimelineMarker[]>;
  rawTimelineChunks: Ref<RawTimelineChunk[]>;
  cleanTextAnchors: Ref<CleanAnchor[]>;
}) {
  const { props, rawTranscriptDurationMs, timelineMarkers, rawTimelineChunks, cleanTextAnchors } =
    options;
  const anchorMapCopied = ref(false);

  async function exportAnchorMapJson() {
    if (!props.hasTranscript) {
      return;
    }

    const payload = {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      timelineMarkerStepMs: TIMELINE_MARKER_STEP_MS,
      rawChunkStepMs: RAW_CHUNK_STEP_MS,
      durationMs: rawTranscriptDurationMs.value,
      timelineMarkers: timelineMarkers.value,
      rawChunks: rawTimelineChunks.value,
      cleanAnchors: cleanTextAnchors.value,
    };
    const json = JSON.stringify(payload, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      anchorMapCopied.value = true;
      setTimeout(() => {
        anchorMapCopied.value = false;
      }, 3000);
      return;
    } catch {
      // Clipboard unavailable, fall back to blob download.
    }

    const blob = new Blob([json], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = `lepupitre-anchor-map-${Date.now()}.json`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  }

  return {
    anchorMapCopied,
    exportAnchorMapJson,
  };
}

export function createTimelineState(
  props: RecorderQuickCleanPanelProps,
  t: TFunction,
  audioPreviewRef: Ref<HTMLAudioElement | null>
) {
  const transcriptTextareaRef = ref<HTMLTextAreaElement | null>(null);

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

  const cleanTextLineAnchors = computed<LineAnchor[]>(() => {
    const lines = props.transcriptText.split("\n");
    const chunks = rawTimelineChunks.value;
    if (!props.hasTranscript || lines.length === 0 || chunks.length === 0) {
      return [];
    }

    return lines.map((line, lineIndex) => {
      const normalized = line.trim();
      if (!normalized) {
        return null;
      }
      const chunk = resolveChunkForLine(normalized, lineIndex, lines.length, chunks);
      return { line: normalized, startMs: chunk.startMs, endMs: chunk.endMs };
    });
  });

  const cleanTextAnchors = computed<CleanAnchor[]>(() => {
    const lines = props.transcriptText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const chunks = rawTimelineChunks.value;
    if (!props.hasTranscript || lines.length === 0 || chunks.length === 0) {
      return [];
    }

    return lines.map((line, index) => {
      const chunk = resolveChunkForLine(line, index, lines.length, chunks);
      return { line, startMs: chunk.startMs, endMs: chunk.endMs };
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
    transcriptTextareaRef,
    timelineMarkers,
    rawTimelineChunks,
    cleanTextAnchors,
    seekToCaretAnchor,
    anchorMapCopied,
    exportAnchorMapJson,
    seekAudio,
  };
}
