import { computed, ref, watch, type Ref } from "vue";
import type { ReviewState, ReviewCtaConfig } from "@/lib/recorderFlow";
import { normalizeTrimWindow } from "@/lib/recorderTrim";
import type { WaveformStyle } from "@/lib/waveform";
import type { TranscriptSegment } from "@/schemas/ipc";

export const AUDIENCE_OPTIONS = ["team", "conference", "client", "other"] as const;
export const GOAL_OPTIONS = ["inform", "persuade", "instruct", "inspire"] as const;

const TIMELINE_MARKER_STEP_MS = 30_000;
const RAW_CHUNK_STEP_MS = 10_000;

type TFunction = (key: string) => string;

type RawTimelineChunk = { startMs: number; endMs: number; text: string };
type TimelineMarker = { atMs: number; label: string; preview: string };
type CleanAnchor = { line: string; startMs: number; endMs: number };
type LineAnchor = CleanAnchor | null;

export type RecorderQuickCleanPanelProps = {
  transcriptText: string;
  rawTranscriptSegments: TranscriptSegment[];
  sourceDurationSec: number | null;
  hasTranscript: boolean;
  isTranscribing: boolean;
  transcribeProgress: number;
  transcribeStageLabel: string | null;
  canTranscribe: boolean;
  showTranscribeBlockedHint: boolean;
  transcribeBlockedMessage: string | null;
  isSavingEdited: boolean;
  canOpenOriginal: boolean;
  isRevealing: boolean;
  isApplyingTrim: boolean;
  canApplyTrim: boolean;
  audioPreviewSources: string[];
  waveformPeaks: number[];
  waveformStyle: WaveformStyle;
  reviewState: ReviewState;
  reviewCta: ReviewCtaConfig;
  canAnalyze: boolean;
  hasAnalysisResult: boolean;
};

export type RecorderQuickCleanPanelEmit = {
  (event: "update:transcriptText", value: string): void;
  (event: "transcribe"): void;
  (event: "saveEdited"): void;
  (event: "autoCleanFillers"): void;
  (event: "fixPunctuation"): void;
  (event: "openOriginal"): void;
  (event: "applyTrim", value: { startMs: number; endMs: number }): void;
  (event: "continue"): void;
  (event: "viewFeedback"): void;
  (event: "analyze"): void;
  (event: "onboardingContext", value: {
    audience: string;
    audienceCustom: string;
    goal: string;
    targetMinutes: number | null;
  }): void;
};

function formatTimelineClock(totalMs: number): string {
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

function createTrimState(props: RecorderQuickCleanPanelProps, emit: RecorderQuickCleanPanelEmit) {
  const trimStartSec = ref(0);
  const trimEndSec = ref(0);

  const trimDurationSec = computed(() => Math.max(0, trimEndSec.value - trimStartSec.value));
  const hasTrimSourceDuration = computed(
    () => typeof props.sourceDurationSec === "number" && props.sourceDurationSec > 0
  );
  const trimMaxSec = computed(() => (hasTrimSourceDuration.value ? props.sourceDurationSec ?? 0 : 0));
  const trimDirty = computed(
    () =>
      hasTrimSourceDuration.value
      && (trimStartSec.value > 0.001 || Math.abs(trimEndSec.value - trimMaxSec.value) > 0.001)
  );

  function applyTrimWindow(startSec: number, endSec: number) {
    const normalized = normalizeTrimWindow(trimMaxSec.value, startSec, endSec);
    if (trimStartSec.value !== normalized.startSec) {
      trimStartSec.value = normalized.startSec;
    }
    if (trimEndSec.value !== normalized.endSec) {
      trimEndSec.value = normalized.endSec;
    }
  }

  function onTrimStartInput(value: number) {
    if (Number.isNaN(value)) {
      return;
    }
    applyTrimWindow(value, trimEndSec.value);
  }

  function onTrimEndInput(value: number) {
    if (Number.isNaN(value)) {
      return;
    }
    applyTrimWindow(trimStartSec.value, value);
  }

  function resetTrimWindow() {
    applyTrimWindow(0, trimMaxSec.value);
  }

  function applyTrim() {
    if (!trimDirty.value || props.isApplyingTrim) {
      return;
    }
    const startMs = Math.round(trimStartSec.value * 1000);
    const endMs = Math.round(trimEndSec.value * 1000);
    if (endMs <= startMs) {
      return;
    }
    emit("applyTrim", { startMs, endMs });
  }

  watch(
    () => props.sourceDurationSec,
    (nextDuration) => {
      if (typeof nextDuration !== "number" || nextDuration <= 0) {
        trimStartSec.value = 0;
        trimEndSec.value = 0;
        return;
      }
      applyTrimWindow(0, nextDuration);
    },
    { immediate: true }
  );

  return {
    trimStartSec,
    trimEndSec,
    trimDurationSec,
    hasTrimSourceDuration,
    trimMaxSec,
    trimDirty,
    applyTrim,
    onTrimStartInput,
    onTrimEndInput,
    resetTrimWindow,
  };
}

function createOnboardingState(emit: RecorderQuickCleanPanelEmit) {
  const showOnboarding = ref(true);
  const onboardingAudience = ref("");
  const onboardingAudienceCustom = ref("");
  const onboardingGoal = ref("");
  const onboardingTargetMinutes = ref<number | null>(null);

  function emitOnboardingContext() {
    emit("onboardingContext", {
      audience: onboardingAudience.value,
      audienceCustom: onboardingAudienceCustom.value,
      goal: onboardingGoal.value,
      targetMinutes: onboardingTargetMinutes.value,
    });
  }

  function selectAudience(value: string) {
    onboardingAudience.value = onboardingAudience.value === value ? "" : value;
    if (onboardingAudience.value !== "other") {
      onboardingAudienceCustom.value = "";
    }
    emitOnboardingContext();
  }

  function selectGoal(value: string) {
    onboardingGoal.value = onboardingGoal.value === value ? "" : value;
    emitOnboardingContext();
  }

  function skipOnboarding() {
    showOnboarding.value = false;
  }

  return {
    showOnboarding,
    onboardingAudience,
    onboardingAudienceCustom,
    onboardingGoal,
    onboardingTargetMinutes,
    emitOnboardingContext,
    selectAudience,
    selectGoal,
    skipOnboarding,
  };
}

function createTimelineState(
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

export function useRecorderQuickCleanPanel(options: {
  props: RecorderQuickCleanPanelProps;
  emit: RecorderQuickCleanPanelEmit;
  t: TFunction;
}) {
  const { props, emit, t } = options;

  const audioPreviewRef = ref<HTMLAudioElement | null>(null);
  const showTranscriptWorkspace = computed(
    () => props.reviewState === "review_transcript_ready" || props.reviewState === "review_analysis_ready"
  );

  function handlePrimaryCta() {
    switch (props.reviewCta.actionName) {
      case "transcribe":
        emit("transcribe");
        break;
      case "analyze":
        emit("analyze");
        break;
      case "view_feedback":
        emit("viewFeedback");
        break;
      case "export_fallback":
        emit("continue");
        break;
    }
  }

  const onboardingState = createOnboardingState(emit);
  const trimState = createTrimState(props, emit);
  const timelineState = createTimelineState(props, t, audioPreviewRef);

  return {
    AUDIENCE_OPTIONS,
    GOAL_OPTIONS,
    audioPreviewRef,
    showTranscriptWorkspace,
    handlePrimaryCta,
    ...onboardingState,
    ...trimState,
    ...timelineState,
    formatTimelineClock,
  };
}
