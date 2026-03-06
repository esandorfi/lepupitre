import type { ComputedRef, Ref } from "vue";
import type { RecorderQualityHintKey, RecorderQualityHintStabilizer } from "@/lib/recorderQualityHint";
import type { TranscriptionSettings } from "@/lib/transcriptionSettings";
import type {
  RecordingInputDevice,
  RecordingTelemetryBudget,
  TranscriptSegment,
  TranscriptV1,
} from "@/schemas/ipc";

export type AudioStatusKey =
  | "audio.status_idle"
  | "audio.status_requesting"
  | "audio.status_recording"
  | "audio.status_encoding";

export type AudioRecorderPhase = "capture" | "quick_clean" | "analyze_export";

type MaybeReadonlyRef<T> = Ref<T> | ComputedRef<T>;

export type AudioRecorderEmit = {
  (event: "saved", payload: { artifactId: string; path: string }): void;
  (
    event: "transcribed",
    payload: { transcriptId: string; isEdited?: boolean; baseTranscriptId?: string }
  ): void;
  (event: "analyze", payload: { transcriptId: string }): void;
  (event: "viewFeedback"): void;
  (
    event: "onboardingContext",
    payload: { audience: string; audienceCustom: string; goal: string; targetMinutes: number | null }
  ): void;
};

export type AudioRecorderRuntimeDeps = {
  t: (key: string) => string;
  emit: AudioRecorderEmit;
  DEFERRED_BACKGROUND_CHECK_MS: number;
  MAX_LIVE_SEGMENTS_PREVIEW: number;
  activeProfileId: MaybeReadonlyRef<string | null>;
  phase: Ref<AudioRecorderPhase>;
  isRecording: Ref<boolean>;
  isPaused: Ref<boolean>;
  isStarting: Ref<boolean>;
  statusKey: Ref<AudioStatusKey>;
  error: Ref<string | null>;
  errorCode: Ref<string | null>;
  announcement: Ref<string>;
  lastSavedPath: Ref<string | null>;
  lastArtifactId: Ref<string | null>;
  lastDurationSec: Ref<number | null>;
  liveDurationSec: Ref<number>;
  liveLevel: Ref<number>;
  qualityHintKey: Ref<RecorderQualityHintKey>;
  qualityHintStabilizer: Ref<RecorderQualityHintStabilizer>;
  isRevealing: Ref<boolean>;
  isApplyingTrim: Ref<boolean>;
  isTranscribing: Ref<boolean>;
  transcribeProgress: Ref<number>;
  transcribeStageLabel: Ref<string | null>;
  transcribeJobId: Ref<string | null>;
  transcribeBlockedCode: Ref<string | null>;
  transcribeBlockedMessage: Ref<string | null>;
  transcript: Ref<TranscriptV1 | null>;
  sourceTranscript: Ref<TranscriptV1 | null>;
  baseTranscriptId: Ref<string | null>;
  editedTranscriptId: Ref<string | null>;
  transcriptDraftText: Ref<string>;
  isSavingEdited: Ref<boolean>;
  exportPath: Ref<string | null>;
  isExporting: Ref<boolean>;
  recordingId: Ref<string | null>;
  liveSegments: Ref<TranscriptSegment[]>;
  livePartial: Ref<string | null>;
  liveWaveformPeaks: Ref<number[]>;
  lastWaveformPeaks: Ref<number[]>;
  inputDevices: Ref<RecordingInputDevice[]>;
  selectedInputDeviceId: Ref<string | null>;
  isLoadingInputDevices: Ref<boolean>;
  telemetryBudget: Ref<RecordingTelemetryBudget | null>;
  telemetryWindowStartMs: Ref<number | null>;
  telemetryEventCount: Ref<number>;
  telemetryMaxPayloadBytes: Ref<number>;
  advancedOpen: Ref<boolean>;
  telemetryReceived: Ref<boolean>;
  noSignalSinceMs: Ref<number | null>;
  isAutoStoppingNoSignal: Ref<boolean>;
  canTranscribe: MaybeReadonlyRef<boolean>;
  canAnalyzeRecorder: MaybeReadonlyRef<boolean>;
  activeTranscriptIdForAnalysis: MaybeReadonlyRef<string | null>;
  transcriptionSettings: Ref<TranscriptionSettings>;
  setDeferredBackgroundCheckTimer: (next: number | null) => void;
  clearError: () => void;
  setError: (message: string, code?: string | null) => void;
  announce: (message: string) => void;
  applyTransport: (action: "start" | "pause" | "resume" | "stop") => void;
  clearStatusTimer: () => void;
  clearTelemetryFallbackTimer: () => void;
  clearDeferredBackgroundCheckTimer: () => void;
  updateNoSignalAutoStop: () => void;
  resetTranscriptionState: () => void;
  armStatusPollingFallback: (sessionRecordingId: string) => void;
  startRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshInputDevices: () => Promise<void>;
  refreshTelemetryBudget: () => Promise<void>;
  refreshTranscribeReadiness: () => Promise<void>;
  transcribeRecording: () => Promise<void>;
  handleCapturePrimaryAction: () => Promise<void>;
  handleShortcut: (event: KeyboardEvent) => void;
};
