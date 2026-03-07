import type { ReviewCtaConfig, ReviewState } from "@/lib/recorderFlow";
import type { WaveformStyle } from "@/lib/waveform";
import type { TranscriptSegment } from "@/schemas/ipc";

export const AUDIENCE_OPTIONS = ["team", "conference", "client", "other"] as const;
export const GOAL_OPTIONS = ["inform", "persuade", "instruct", "inspire"] as const;

export const TIMELINE_MARKER_STEP_MS = 30_000;
export const RAW_CHUNK_STEP_MS = 10_000;

export type TFunction = (key: string) => string;

export type RawTimelineChunk = { startMs: number; endMs: number; text: string };
export type TimelineMarker = { atMs: number; label: string; preview: string };
export type CleanAnchor = { line: string; startMs: number; endMs: number };
export type LineAnchor = CleanAnchor | null;

export type RecorderQuickCleanPanelProps = {
  isFinalizingCapture?: boolean;
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
  (
    event: "onboardingContext",
    value: {
      audience: string;
      audienceCustom: string;
      goal: string;
      targetMinutes: number | null;
    }
  ): void;
};
