import { computed, ref } from "vue";
import { appState } from "@/stores/app";
import {
  createRecorderQualityHintStabilizer,
  type RecorderQualityHintKey,
} from "@/lib/recorderQualityHint";
import type {
  RecordingInputDevice,
  RecordingTelemetryBudget,
  TranscriptSegment,
  TranscriptV1,
} from "@/schemas/ipc";
import type {
  AudioRecorderPhase,
  AudioStatusKey,
} from "@/components/recorder/composables/audioRecorderRuntimeDeps";

/**
 * Provides the use audio recorder state composable contract.
 */
export function useAudioRecorderState() {
  const activeProfileId = computed(() => appState.activeProfileId);
  const phase = ref<AudioRecorderPhase>("capture");
  const isRecording = ref(false);
  const isPaused = ref(false);
  const isStarting = ref(false);
  const statusKey = ref<AudioStatusKey>("audio.status_idle");
  const error = ref<string | null>(null);
  const errorCode = ref<string | null>(null);
  const announcement = ref("");
  const lastSavedPath = ref<string | null>(null);
  const lastArtifactId = ref<string | null>(null);
  const lastDurationSec = ref<number | null>(null);
  const liveDurationSec = ref<number>(0);
  const liveLevel = ref<number>(0);
  const qualityHintKey = ref<RecorderQualityHintKey>("good_level");
  const qualityHintStabilizer = ref(createRecorderQualityHintStabilizer("good_level"));
  const isRevealing = ref(false);
  const isApplyingTrim = ref(false);
  const isTranscribing = ref(false);
  const transcribeProgress = ref<number>(0);
  const transcribeStageLabel = ref<string | null>(null);
  const transcribeJobId = ref<string | null>(null);
  const transcribeBlockedCode = ref<string | null>(null);
  const transcribeBlockedMessage = ref<string | null>(null);
  const transcript = ref<TranscriptV1 | null>(null);
  const sourceTranscript = ref<TranscriptV1 | null>(null);
  const baseTranscriptId = ref<string | null>(null);
  const editedTranscriptId = ref<string | null>(null);
  const transcriptDraftText = ref("");
  const isSavingEdited = ref(false);
  const exportPath = ref<string | null>(null);
  const isExporting = ref(false);
  const recordingId = ref<string | null>(null);
  const liveSegments = ref<TranscriptSegment[]>([]);
  const livePartial = ref<string | null>(null);
  const liveWaveformPeaks = ref<number[]>([]);
  const lastWaveformPeaks = ref<number[]>([]);
  const inputDevices = ref<RecordingInputDevice[]>([]);
  const selectedInputDeviceId = ref<string | null>(null);
  const isLoadingInputDevices = ref(false);
  const telemetryBudget = ref<RecordingTelemetryBudget | null>(null);
  const telemetryWindowStartMs = ref<number | null>(null);
  const telemetryEventCount = ref(0);
  const telemetryMaxPayloadBytes = ref(0);
  const advancedOpen = ref(false);
  const telemetryReceived = ref(false);
  const noSignalSinceMs = ref<number | null>(null);
  const isAutoStoppingNoSignal = ref(false);

  return {
    activeProfileId,
    phase,
    isRecording,
    isPaused,
    isStarting,
    statusKey,
    error,
    errorCode,
    announcement,
    lastSavedPath,
    lastArtifactId,
    lastDurationSec,
    liveDurationSec,
    liveLevel,
    qualityHintKey,
    qualityHintStabilizer,
    isRevealing,
    isApplyingTrim,
    isTranscribing,
    transcribeProgress,
    transcribeStageLabel,
    transcribeJobId,
    transcribeBlockedCode,
    transcribeBlockedMessage,
    transcript,
    sourceTranscript,
    baseTranscriptId,
    editedTranscriptId,
    transcriptDraftText,
    isSavingEdited,
    exportPath,
    isExporting,
    recordingId,
    liveSegments,
    livePartial,
    liveWaveformPeaks,
    lastWaveformPeaks,
    inputDevices,
    selectedInputDeviceId,
    isLoadingInputDevices,
    telemetryBudget,
    telemetryWindowStartMs,
    telemetryEventCount,
    telemetryMaxPayloadBytes,
    advancedOpen,
    telemetryReceived,
    noSignalSinceMs,
    isAutoStoppingNoSignal,
  };
}

export type AudioRecorderState = ReturnType<typeof useAudioRecorderState>;
