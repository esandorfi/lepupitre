<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { RouterLink } from "vue-router";
import RecorderAdvancedDrawer from "./recorder/RecorderAdvancedDrawer.vue";
import RecorderCapturePanel from "./recorder/RecorderCapturePanel.vue";
import RecorderExportPanel from "./recorder/RecorderExportPanel.vue";
import RecorderQuickCleanPanel from "./recorder/RecorderQuickCleanPanel.vue";
import { classifyAsrError } from "../lib/asrErrors";
import { useI18n } from "../lib/i18n";
import { readPreference, writePreference } from "../lib/preferencesStorage";
import { useUiPreferences } from "../lib/uiPreferences";
import {
  createRecorderQualityHintStabilizer,
  normalizeRecorderQualityHint,
  updateRecorderQualityHint,
} from "../lib/recorderQualityHint";
import {
  isTypingTargetElement,
  recorderStopTransitionPlan,
  resolveRecorderTranscribeReadiness,
  resolveRecorderShortcutAction,
  resolveActiveTranscriptIdForAnalysis,
} from "../lib/recorderFlow";
import { useTranscriptionSettings } from "../lib/transcriptionSettings";
import {
  buildRecordingStartPayload,
  buildTranscribeAudioPayload,
} from "../lib/asrPayloads";
import { appStore } from "../stores/app";
import { invokeChecked } from "../composables/useIpc";
import {
  AudioTrimPayloadSchema,
  AudioTrimResponseSchema,
  AsrCommitEventSchema,
  AsrFinalProgressEventSchema,
  AsrFinalResultEventSchema,
  AsrModelVerifyPayloadSchema,
  AsrModelVerifyResultSchema,
  AsrPartialEventSchema,
  AsrSidecarStatusResponseSchema,
  EmptyPayloadSchema,
  ExportResultSchema,
  RecordingPausePayloadSchema,
  RecordingResumePayloadSchema,
  RecordingStartPayloadSchema,
  RecordingStartResponseSchema,
  RecordingTelemetryEventSchema,
  RecordingStatusPayloadSchema,
  RecordingStatusResponseSchema,
  RecordingStopPayloadSchema,
  RecordingStopResponseSchema,
  TranscriptEditSavePayloadSchema,
  TranscriptEditSaveResponseSchema,
  TranscriptExportFormat,
  TranscriptExportPayloadSchema,
  TranscriptGetPayloadSchema,
  TranscriptSegment,
  TranscriptV1,
  TranscriptV1Schema,
  TranscribeAudioPayloadSchema,
  TranscribeResponseSchema,
  VoidResponseSchema,
} from "../schemas/ipc";

type AudioStatusKey =
  | "audio.status_idle"
  | "audio.status_requesting"
  | "audio.status_recording"
  | "audio.status_encoding";

const ADVANCED_DRAWER_PREF_KEY = "lepupitre.recorder.advanced.open.v1";
const AUTO_TRANSCRIBE_ON_STOP = true;

const props = withDefaults(
  defineProps<{
    titleKey?: string;
    subtitleKey?: string;
    passLabelKey?: string;
    showPassLabel?: boolean;
    canAnalyze?: boolean;
    isAnalyzing?: boolean;
  }>(),
  {
    titleKey: "audio.title",
    subtitleKey: "audio.subtitle",
    passLabelKey: "audio.pass_label",
    showPassLabel: true,
    canAnalyze: true,
    isAnalyzing: false,
  }
);

const { t } = useI18n();
const { settings: uiSettings, setWaveformStyle } = useUiPreferences();
const { settings: transcriptionSettings, updateSettings: updateTranscriptionSettings } =
  useTranscriptionSettings();
const emit = defineEmits<{
  (event: "saved", payload: { artifactId: string; path: string }): void;
  (
    event: "transcribed",
    payload: { transcriptId: string; isEdited?: boolean; baseTranscriptId?: string }
  ): void;
  (event: "analyze", payload: { transcriptId: string }): void;
}>();

const activeProfileId = computed(() => appStore.state.activeProfileId);
const phase = ref<"capture" | "quick_clean" | "analyze_export">("capture");
const isRecording = ref(false);
const isPaused = ref(false);
const statusKey = ref<AudioStatusKey>("audio.status_idle");
const error = ref<string | null>(null);
const errorCode = ref<string | null>(null);
const announcement = ref("");
const lastSavedPath = ref<string | null>(null);
const lastArtifactId = ref<string | null>(null);
const lastDurationSec = ref<number | null>(null);
const liveDurationSec = ref<number>(0);
const liveLevel = ref<number>(0);
const qualityHintKey = ref("good_level");
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
const advancedOpen = ref(readPreference(ADVANCED_DRAWER_PREF_KEY) === "1");
const telemetryReceived = ref(false);

let statusTimer: number | null = null;
let telemetryFallbackTimer: number | null = null;
let unlistenProgress: (() => void) | null = null;
let unlistenCompleted: (() => void) | null = null;
let unlistenFailed: (() => void) | null = null;
let unlistenAsrPartial: (() => void) | null = null;
let unlistenAsrCommit: (() => void) | null = null;
let unlistenAsrFinalProgress: (() => void) | null = null;
let unlistenAsrFinalResult: (() => void) | null = null;
let unlistenRecordingTelemetry: (() => void) | null = null;

type JobProgressEvent = {
  jobId: string;
  stage: string;
  pct: number;
  message?: string;
};

type JobCompletedEvent = {
  jobId: string;
  resultId: string;
};

type JobFailedEvent = {
  jobId: string;
  errorCode: string;
  message: string;
};

const activeTranscriptIdForAnalysis = computed(
  () => resolveActiveTranscriptIdForAnalysis(baseTranscriptId.value, editedTranscriptId.value)
);

const canAnalyzeRecorder = computed(
  () => !!activeTranscriptIdForAnalysis.value && !!props.canAnalyze
);
const waveformStyle = computed(() => uiSettings.value.waveformStyle);

const canExport = computed(() => !!activeTranscriptIdForAnalysis.value);
const transcribeReadiness = computed(() =>
  resolveRecorderTranscribeReadiness({
    hasAudioArtifact: !!lastArtifactId.value,
    isTranscribing: isTranscribing.value,
    isApplyingTrim: isApplyingTrim.value,
    transcribeBlockedCode: transcribeBlockedCode.value,
  })
);
const canTranscribe = computed(() => transcribeReadiness.value.canTranscribe);
const canOpenOriginal = computed(() => !!lastSavedPath.value);
const audioPreviewSrc = computed(() =>
  lastSavedPath.value ? convertFileSrc(lastSavedPath.value) : null
);
const livePreview = computed(() => {
  const committed = liveSegments.value
    .slice(-2)
    .map((segment) => segment.text.trim())
    .filter((segment) => segment.length > 0)
    .join(" ");
  const partial = livePartial.value?.trim() ?? "";
  if (committed && partial) {
    return `${committed} ${partial}`.trim();
  }
  return committed || partial || null;
});
const recBadgeLabel = computed(() =>
  isRecording.value && !isPaused.value ? t("audio.rec_badge") : t("audio.paused_badge")
);
const qualityLabel = computed(() => {
  if (qualityHintKey.value === "no_signal") {
    return t("audio.quality_no_signal");
  }
  if (qualityHintKey.value === "too_loud") {
    return t("audio.quality_too_loud");
  }
  if (qualityHintKey.value === "noisy_room") {
    return t("audio.quality_noisy_room");
  }
  if (qualityHintKey.value === "too_quiet") {
    return t("audio.quality_too_quiet");
  }
  return t("audio.quality_good_level");
});
const qualityTone = computed<"good" | "warn" | "danger" | "muted">(() => {
  if (qualityHintKey.value === "good_level") {
    return "good";
  }
  if (qualityHintKey.value === "too_loud" || qualityHintKey.value === "no_signal") {
    return "danger";
  }
  if (qualityHintKey.value === "too_quiet" || qualityHintKey.value === "noisy_room") {
    return "warn";
  }
  return "muted";
});
const capturePrimaryLabel = computed(() => {
  if (isRecording.value) {
    return t("audio.pause");
  }
  if (recordingId.value && isPaused.value) {
    return t("audio.resume");
  }
  return t("audio.start");
});
const captureStopLabel = computed(() => t("audio.stop"));
const captureCanPrimary = computed(() => {
  if (!activeProfileId.value) {
    return false;
  }
  if (!recordingId.value) {
    return true;
  }
  return true;
});
const captureCanStop = computed(() => !!recordingId.value && !statusKey.value.includes("encoding"));

function setAdvancedOpen(next: boolean) {
  advancedOpen.value = next;
  writePreference(ADVANCED_DRAWER_PREF_KEY, next ? "1" : "0");
}

function clearError() {
  error.value = null;
  errorCode.value = null;
}

function setError(message: string, code: string | null = null) {
  error.value = message;
  errorCode.value = code;
}

function mapStageToLabel(stage: string | null, message?: string | null) {
  if (message) {
    switch (message) {
      case "queued":
        return t("audio.stage_queued");
      case "analyze_audio":
        return t("audio.stage_analyze");
      case "serialize":
        return t("audio.stage_serialize");
      case "done":
        return t("audio.stage_done");
      default:
        break;
    }
  }
  if (!stage) {
    return null;
  }
  if (stage === "transcribe") {
    return t("audio.stage_transcribe");
  }
  return t("audio.stage_processing");
}

function resetLiveTranscript() {
  liveSegments.value = [];
  livePartial.value = null;
}

function resetQualityHintState() {
  qualityHintStabilizer.value = createRecorderQualityHintStabilizer("good_level");
  qualityHintKey.value = "good_level";
}

function applyQualityHint(rawHint: string | null | undefined) {
  const normalized = normalizeRecorderQualityHint(rawHint);
  qualityHintKey.value = updateRecorderQualityHint(
    qualityHintStabilizer.value,
    normalized,
    Date.now()
  );
}

function resetTranscriptionState() {
  isTranscribing.value = false;
  transcribeProgress.value = 0;
  transcribeStageLabel.value = null;
  transcribeJobId.value = null;
  transcript.value = null;
  baseTranscriptId.value = null;
  editedTranscriptId.value = null;
  transcriptDraftText.value = "";
  exportPath.value = null;
}

function formatDuration(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "0:00";
  }
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function levelPercent(value: number) {
  return Math.max(0, Math.min(1, value)) * 100;
}

function transcriptToEditorText(value: TranscriptV1): string {
  return value.segments.map((segment) => segment.text.trim()).join("\n").trim();
}

function announce(message: string) {
  announcement.value = "";
  requestAnimationFrame(() => {
    announcement.value = message;
  });
}

function clearStatusTimer() {
  if (statusTimer) {
    window.clearInterval(statusTimer);
    statusTimer = null;
  }
}

function clearTelemetryFallbackTimer() {
  if (telemetryFallbackTimer) {
    window.clearTimeout(telemetryFallbackTimer);
    telemetryFallbackTimer = null;
  }
}

function startStatusPollingFallback() {
  if (statusTimer || !recordingId.value) {
    return;
  }
  void refreshStatus();
  statusTimer = window.setInterval(() => {
    void refreshStatus();
  }, 200);
}

function armStatusPollingFallback(sessionRecordingId: string) {
  clearTelemetryFallbackTimer();
  telemetryFallbackTimer = window.setTimeout(() => {
    telemetryFallbackTimer = null;
    if (!recordingId.value || recordingId.value !== sessionRecordingId || telemetryReceived.value) {
      return;
    }
    startStatusPollingFallback();
  }, 700);
}

async function refreshStatus() {
  const currentRecordingId = recordingId.value;
  if (!currentRecordingId) {
    return;
  }
  try {
    const status = await invokeChecked(
      "recording_status",
      RecordingStatusPayloadSchema,
      RecordingStatusResponseSchema,
      { recordingId: currentRecordingId }
    );
    if (recordingId.value !== currentRecordingId) {
      return;
    }
    liveDurationSec.value = status.durationMs / 1000;
    liveLevel.value = status.level;
    isPaused.value = status.isPaused ?? false;
    applyQualityHint(status.qualityHintKey);
  } catch (err) {
    if (recordingId.value !== currentRecordingId) {
      return;
    }
    setError(err instanceof Error ? err.message : String(err));
  }
}

async function refreshTranscribeReadiness() {
  transcribeBlockedCode.value = null;
  transcribeBlockedMessage.value = null;
  clearError();

  try {
    await invokeChecked(
      "asr_sidecar_status",
      EmptyPayloadSchema,
      AsrSidecarStatusResponseSchema,
      {}
    );
  } catch (err) {
    const code = classifyAsrError(err instanceof Error ? err.message : String(err));
    if (code === "sidecar_missing") {
      transcribeBlockedCode.value = code;
      transcribeBlockedMessage.value = t("audio.error_sidecar_missing");
      return;
    }
  }

  try {
    const model = transcriptionSettings.value.model ?? "tiny";
    const verified = await invokeChecked(
      "asr_model_verify",
      AsrModelVerifyPayloadSchema,
      AsrModelVerifyResultSchema,
      { modelId: model }
    );
    if (!verified.installed || verified.checksum_ok === false) {
      transcribeBlockedCode.value = "model_missing";
      transcribeBlockedMessage.value = t("audio.error_model_missing");
    }
  } catch (err) {
    const code = classifyAsrError(err instanceof Error ? err.message : String(err));
    if (code === "model_missing") {
      transcribeBlockedCode.value = code;
      transcribeBlockedMessage.value = t("audio.error_model_missing");
    }
  }
}

async function startRecording() {
  clearError();
  if (!activeProfileId.value) {
    setError(t("audio.profile_required"));
    return;
  }
  lastSavedPath.value = null;
  lastArtifactId.value = null;
  lastDurationSec.value = null;
  liveDurationSec.value = 0;
  liveLevel.value = 0;
  resetQualityHintState();
  statusKey.value = "audio.status_requesting";
  phase.value = "capture";
  resetTranscriptionState();
  resetLiveTranscript();
  liveWaveformPeaks.value = [];
  lastWaveformPeaks.value = [];

  try {
    const result = await invokeChecked(
      "recording_start",
      RecordingStartPayloadSchema,
      RecordingStartResponseSchema,
      buildRecordingStartPayload(activeProfileId.value, transcriptionSettings.value)
    );
    recordingId.value = result.recordingId;
    isRecording.value = true;
    isPaused.value = false;
    telemetryReceived.value = false;
    statusKey.value = "audio.status_recording";
    clearStatusTimer();
    armStatusPollingFallback(result.recordingId);
    announce(t("audio.announcement_started"));
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
    statusKey.value = "audio.status_idle";
  }
}

async function pauseRecording() {
  if (!recordingId.value || !isRecording.value) {
    return;
  }
  try {
    await invokeChecked("recording_pause", RecordingPausePayloadSchema, VoidResponseSchema, {
      recordingId: recordingId.value,
    });
    isRecording.value = false;
    isPaused.value = true;
    statusKey.value = "audio.status_recording";
    announce(t("audio.announcement_paused"));
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  }
}

async function resumeRecording() {
  if (!recordingId.value || !isPaused.value) {
    return;
  }
  try {
    await invokeChecked("recording_resume", RecordingResumePayloadSchema, VoidResponseSchema, {
      recordingId: recordingId.value,
    });
    isRecording.value = true;
    isPaused.value = false;
    statusKey.value = "audio.status_recording";
    announce(t("audio.announcement_resumed"));
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  }
}

async function stopRecording() {
  if (!recordingId.value || !activeProfileId.value) {
    return;
  }
  isRecording.value = false;
  isPaused.value = false;
  statusKey.value = "audio.status_encoding";
  clearStatusTimer();
  clearTelemetryFallbackTimer();

  try {
    const result = await invokeChecked(
      "recording_stop",
      RecordingStopPayloadSchema,
      RecordingStopResponseSchema,
      { profileId: activeProfileId.value, recordingId: recordingId.value }
    );
    lastSavedPath.value = result.path;
    lastArtifactId.value = result.artifactId;
    lastDurationSec.value = result.durationMs / 1000;
    lastWaveformPeaks.value = liveWaveformPeaks.value.slice();
    emit("saved", { artifactId: result.artifactId, path: result.path });
    liveLevel.value = 0;
    statusKey.value = "audio.status_idle";
    const stopPlan = recorderStopTransitionPlan(AUTO_TRANSCRIBE_ON_STOP, false);
    phase.value = stopPlan.nextPhase;
    announce(t("audio.announcement_stopped"));

    await refreshTranscribeReadiness();
    if (recorderStopTransitionPlan(AUTO_TRANSCRIBE_ON_STOP, canTranscribe.value).shouldAutoTranscribe) {
      await transcribeRecording();
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
    statusKey.value = "audio.status_idle";
  } finally {
    recordingId.value = null;
    telemetryReceived.value = false;
  }
}

async function applyTrim(payload: { startMs: number; endMs: number }) {
  clearError();
  if (!activeProfileId.value || !lastArtifactId.value) {
    return;
  }
  if (isApplyingTrim.value) {
    return;
  }

  isApplyingTrim.value = true;
  try {
    const result = await invokeChecked(
      "audio_trim_wav",
      AudioTrimPayloadSchema,
      AudioTrimResponseSchema,
      {
        profileId: activeProfileId.value,
        audioArtifactId: lastArtifactId.value,
        startMs: payload.startMs,
        endMs: payload.endMs,
      }
    );
    lastSavedPath.value = result.path;
    lastArtifactId.value = result.artifactId;
    lastDurationSec.value = result.durationMs / 1000;
    resetTranscriptionState();
    lastWaveformPeaks.value = [];
    emit("saved", { artifactId: result.artifactId, path: result.path });
    announce(t("audio.quick_clean_trim_applied"));
    await refreshTranscribeReadiness();
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  } finally {
    isApplyingTrim.value = false;
  }
}

async function transcribeRecording() {
  clearError();
  if (!activeProfileId.value || !lastArtifactId.value) {
    return;
  }
  if (!canTranscribe.value) {
    return;
  }

  transcribeBlockedCode.value = null;
  transcribeBlockedMessage.value = null;
  isTranscribing.value = true;
  transcript.value = null;
  transcribeProgress.value = 0;
  transcribeStageLabel.value = null;

  try {
    const response = await invokeChecked(
      "transcribe_audio",
      TranscribeAudioPayloadSchema,
      TranscribeResponseSchema,
      buildTranscribeAudioPayload(
        activeProfileId.value,
        lastArtifactId.value,
        transcriptionSettings.value
      )
    );
    transcribeJobId.value = response.jobId ?? transcribeJobId.value;
    baseTranscriptId.value = response.transcriptId;
    editedTranscriptId.value = null;
    exportPath.value = null;

    const loaded = await invokeChecked(
      "transcript_get",
      TranscriptGetPayloadSchema,
      TranscriptV1Schema,
      {
        profileId: activeProfileId.value,
        transcriptId: response.transcriptId,
      }
    );
    transcript.value = loaded;
    transcriptDraftText.value = transcriptToEditorText(loaded);
    emit("transcribed", {
      transcriptId: response.transcriptId,
      isEdited: false,
      baseTranscriptId: response.transcriptId,
    });
    transcribeProgress.value = 100;
    transcribeStageLabel.value = t("audio.stage_done");
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const code = classifyAsrError(raw);
    if (code === "sidecar_missing") {
      transcribeBlockedCode.value = code;
      transcribeBlockedMessage.value = t("audio.error_sidecar_missing");
      setError(transcribeBlockedMessage.value, code);
    } else if (code === "model_missing") {
      transcribeBlockedCode.value = code;
      transcribeBlockedMessage.value = t("audio.error_model_missing");
      setError(transcribeBlockedMessage.value, code);
    } else if (code === "asr_timeout") {
      setError(t("audio.error_asr_timeout"), code);
    } else {
      setError(raw);
    }
  } finally {
    isTranscribing.value = false;
  }
}

async function saveEditedTranscript() {
  if (!activeProfileId.value || !baseTranscriptId.value) {
    return;
  }
  const editedText = transcriptDraftText.value.trim();
  if (!editedText) {
    setError(t("audio.transcript_empty"));
    return;
  }

  isSavingEdited.value = true;
  clearError();
  try {
    const saved = await invokeChecked(
      "transcript_edit_save",
      TranscriptEditSavePayloadSchema,
      TranscriptEditSaveResponseSchema,
      {
        profileId: activeProfileId.value,
        transcriptId: baseTranscriptId.value,
        editedText,
      }
    );
    editedTranscriptId.value = saved.transcriptId;
    const loaded = await invokeChecked(
      "transcript_get",
      TranscriptGetPayloadSchema,
      TranscriptV1Schema,
      {
        profileId: activeProfileId.value,
        transcriptId: saved.transcriptId,
      }
    );
    transcript.value = loaded;
    transcriptDraftText.value = transcriptToEditorText(loaded);
    emit("transcribed", {
      transcriptId: saved.transcriptId,
      isEdited: true,
      baseTranscriptId: baseTranscriptId.value,
    });
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  } finally {
    isSavingEdited.value = false;
  }
}

function autoCleanFillers() {
  const next = transcriptDraftText.value
    .replace(/\b(uh|um|erm|eh|like|you know)\b/gi, "")
    .replace(/\b(euh|heu|ben)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  transcriptDraftText.value = next;
}

function fixPunctuation() {
  let next = transcriptDraftText.value
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/([,.;!?])([^\s\n])/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (next.length > 0) {
    next = next[0].toUpperCase() + next.slice(1);
  }
  transcriptDraftText.value = next;
}

function goAnalyzeExport() {
  if (!activeTranscriptIdForAnalysis.value) {
    return;
  }
  phase.value = "analyze_export";
}

function backToQuickClean() {
  phase.value = "quick_clean";
}

function requestAnalyze() {
  if (!activeTranscriptIdForAnalysis.value || !canAnalyzeRecorder.value) {
    return;
  }
  emit("analyze", { transcriptId: activeTranscriptIdForAnalysis.value });
}

async function exportTranscript(format: TranscriptExportFormat) {
  if (!activeProfileId.value || !activeTranscriptIdForAnalysis.value) {
    return;
  }
  isExporting.value = true;
  clearError();
  try {
    const result = await invokeChecked(
      "transcript_export",
      TranscriptExportPayloadSchema,
      ExportResultSchema,
      {
        profileId: activeProfileId.value,
        transcriptId: activeTranscriptIdForAnalysis.value,
        format,
      }
    );
    exportPath.value = result.path;
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  } finally {
    isExporting.value = false;
  }
}

function exportPreset(preset: "presentation" | "podcast" | "voice_note") {
  if (preset === "presentation") {
    void exportTranscript("txt");
    return;
  }
  if (preset === "podcast") {
    void exportTranscript("srt");
    return;
  }
  void exportTranscript("vtt");
}

async function openExportPath() {
  if (!exportPath.value) {
    return;
  }
  try {
    await open(exportPath.value);
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  }
}

async function revealRecording() {
  if (!lastSavedPath.value) {
    return;
  }
  isRevealing.value = true;
  clearError();
  try {
    await invoke("audio_reveal_wav", { path: lastSavedPath.value });
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  } finally {
    isRevealing.value = false;
  }
}

async function handleCapturePrimaryAction() {
  if (isRecording.value) {
    await pauseRecording();
    return;
  }
  if (recordingId.value && isPaused.value) {
    await resumeRecording();
    return;
  }
  await startRecording();
}

function handleShortcut(event: KeyboardEvent) {
  if (isTypingTargetElement(event.target)) {
    return;
  }

  const action = resolveRecorderShortcutAction({
    key: event.key,
    ctrlOrMeta: event.metaKey || event.ctrlKey,
    phase: phase.value,
    canTranscribe: canTranscribe.value,
    hasTranscriptForAnalysis: !!activeTranscriptIdForAnalysis.value,
  });
  if (!action) {
    return;
  }

  event.preventDefault();
  if (action === "capture_primary") {
    void handleCapturePrimaryAction();
    return;
  }
  if (action === "transcribe") {
    void transcribeRecording();
    return;
  }
  if (action === "continue_to_analyze_export") {
    phase.value = "analyze_export";
    return;
  }
  if (action === "analyze") {
    requestAnalyze();
    return;
  }
}

onMounted(async () => {
  void refreshTranscribeReadiness();
  window.addEventListener("keydown", handleShortcut);

  unlistenProgress = await listen<JobProgressEvent>("job:progress", (event) => {
    if (transcribeJobId.value && event.payload.jobId !== transcribeJobId.value) {
      return;
    }
    if (!transcribeJobId.value) {
      transcribeJobId.value = event.payload.jobId;
    }
    transcribeProgress.value = event.payload.pct;
    transcribeStageLabel.value = mapStageToLabel(event.payload.stage, event.payload.message);
  });

  unlistenCompleted = await listen<JobCompletedEvent>("job:completed", (event) => {
    if (transcribeJobId.value && event.payload.jobId !== transcribeJobId.value) {
      return;
    }
    transcribeProgress.value = 100;
  });

  unlistenFailed = await listen<JobFailedEvent>("job:failed", (event) => {
    if (transcribeJobId.value && event.payload.jobId !== transcribeJobId.value) {
      return;
    }
    setError(event.payload.message, event.payload.errorCode);
  });

  unlistenRecordingTelemetry = await listen("recording/telemetry/v1", (event) => {
    const parsed = RecordingTelemetryEventSchema.safeParse(event.payload);
    if (!parsed.success || !recordingId.value) {
      return;
    }
    telemetryReceived.value = true;
    clearTelemetryFallbackTimer();
    clearStatusTimer();
    liveDurationSec.value = parsed.data.durationMs / 1000;
    liveLevel.value = parsed.data.level;
    liveWaveformPeaks.value = parsed.data.waveformPeaks.slice();
    applyQualityHint(parsed.data.qualityHintKey);
  });

  unlistenAsrPartial = await listen("asr/partial/v1", (event) => {
    if (!isRecording.value) {
      return;
    }
    const parsed = AsrPartialEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    livePartial.value = parsed.data.text;
  });

  unlistenAsrCommit = await listen("asr/commit/v1", (event) => {
    const parsed = AsrCommitEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    liveSegments.value = [...liveSegments.value, ...parsed.data.segments];
    livePartial.value = null;
  });

  unlistenAsrFinalProgress = await listen("asr/final_progress/v1", (event) => {
    const parsed = AsrFinalProgressEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    if (!isTranscribing.value && !transcribeJobId.value) {
      return;
    }
    const total = parsed.data.totalMs;
    if (total <= 0) {
      return;
    }
    const pct = Math.min(100, Math.round((parsed.data.processedMs / total) * 100));
    transcribeProgress.value = pct;
    transcribeStageLabel.value = t("audio.stage_final");
  });

  unlistenAsrFinalResult = await listen("asr/final_result/v1", (event) => {
    const parsed = AsrFinalResultEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    transcribeProgress.value = 100;
    transcribeStageLabel.value = t("audio.stage_final");
    liveSegments.value = [];
    livePartial.value = null;
    const current = transcript.value;
    transcript.value = {
      schema_version: "1.0.0",
      language: current?.language ?? "und",
      model_id: current?.model_id ?? null,
      duration_ms: current?.duration_ms ?? null,
      segments: parsed.data.segments,
    };
  });
});

onBeforeUnmount(() => {
  clearStatusTimer();
  clearTelemetryFallbackTimer();
  window.removeEventListener("keydown", handleShortcut);
  unlistenProgress?.();
  unlistenCompleted?.();
  unlistenFailed?.();
  unlistenRecordingTelemetry?.();
  unlistenAsrPartial?.();
  unlistenAsrCommit?.();
  unlistenAsrFinalProgress?.();
  unlistenAsrFinalResult?.();
});

watch(
  () => transcriptionSettings.value.model,
  () => {
    void refreshTranscribeReadiness();
  }
);
</script>

<template>
  <div class="app-panel app-panel-compact space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold">{{ t(props.titleKey) }}</h2>
        <p class="app-muted text-sm">{{ t(props.subtitleKey) }}</p>
      </div>
      <div v-if="props.showPassLabel" class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t(props.passLabelKey) }}
      </div>
    </div>

    <div class="app-muted app-text-meta">
      <span v-if="phase === 'capture'">{{ t("audio.phase_capture") }}</span>
      <span v-else-if="phase === 'quick_clean'">{{ t("audio.phase_quick_clean") }}</span>
      <span v-else>{{ t("audio.phase_analyze_export") }}</span>
    </div>

    <RecorderCapturePanel
      v-if="phase === 'capture'"
      :primary-label="capturePrimaryLabel"
      :stop-label="captureStopLabel"
      :can-primary="captureCanPrimary"
      :can-stop="captureCanStop"
      :duration-label="formatDuration(isRecording || isPaused ? liveDurationSec : lastDurationSec)"
      :level-percent="levelPercent(liveLevel)"
      :quality-label="qualityLabel"
      :quality-tone="qualityTone"
      :rec-badge-label="recBadgeLabel"
      :show-rec-badge="isRecording || isPaused"
      :live-preview="livePreview"
      :waveform-peaks="liveWaveformPeaks"
      :waveform-style="waveformStyle"
      @primary="handleCapturePrimaryAction"
      @stop="stopRecording"
    />

    <RecorderQuickCleanPanel
      v-if="phase === 'quick_clean'"
      v-model:transcript-text="transcriptDraftText"
      :source-duration-sec="lastDurationSec"
      :has-transcript="!!baseTranscriptId"
      :is-transcribing="isTranscribing"
      :transcribe-progress="transcribeProgress"
      :transcribe-stage-label="transcribeStageLabel"
      :can-transcribe="canTranscribe"
      :show-transcribe-blocked-hint="transcribeReadiness.showBlockedHint"
      :transcribe-blocked-message="transcribeBlockedMessage"
      :is-saving-edited="isSavingEdited"
      :can-open-original="canOpenOriginal"
      :is-revealing="isRevealing"
      :is-applying-trim="isApplyingTrim"
      :audio-preview-src="audioPreviewSrc"
      :waveform-peaks="lastWaveformPeaks"
      :waveform-style="waveformStyle"
      @transcribe="transcribeRecording"
      @apply-trim="applyTrim"
      @save-edited="saveEditedTranscript"
      @auto-clean-fillers="autoCleanFillers"
      @fix-punctuation="fixPunctuation"
      @open-original="revealRecording"
      @continue="goAnalyzeExport"
    />

    <RecorderExportPanel
      v-if="phase === 'analyze_export'"
      :can-analyze="canAnalyzeRecorder"
      :is-analyzing="props.isAnalyzing"
      :can-export="canExport"
      :is-exporting="isExporting"
      :export-path="exportPath"
      @analyze="requestAnalyze"
      @export-preset="exportPreset"
      @export-format="exportTranscript"
      @open-export-path="openExportPath"
      @back="backToQuickClean"
    />

    <RecorderAdvancedDrawer
      :open="advancedOpen"
      :model="transcriptionSettings.model"
      :mode="transcriptionSettings.mode"
      :language="transcriptionSettings.language"
      :spoken-punctuation="transcriptionSettings.spokenPunctuation"
      :waveform-style="waveformStyle"
      :diagnostics-code="errorCode ?? transcribeBlockedCode"
      @toggle="setAdvancedOpen(!advancedOpen)"
      @update:model="(value) => updateTranscriptionSettings({ model: value })"
      @update:mode="(value) => updateTranscriptionSettings({ mode: value })"
      @update:language="(value) => updateTranscriptionSettings({ language: value })"
      @update:spoken-punctuation="(value) => updateTranscriptionSettings({ spokenPunctuation: value })"
      @update:waveform-style="(value) => setWaveformStyle(value)"
    />

    <div v-if="lastSavedPath" class="flex flex-wrap items-center gap-2 text-xs">
      <span class="app-link">{{ t("audio.saved_to") }}:</span>
      <span class="app-text max-w-[360px] truncate" style="direction: rtl; text-align: left;">
        {{ lastSavedPath }}
      </span>
    </div>

    <div v-if="error" class="app-danger-text text-xs">{{ error }}</div>
    <RouterLink
      v-if="(errorCode === 'model_missing' || transcribeBlockedCode === 'model_missing') && phase === 'quick_clean'"
      to="/settings"
      class="app-link text-xs underline"
    >
      {{ t("audio.error_model_missing_action") }}
    </RouterLink>
    <RouterLink
      v-if="(errorCode === 'sidecar_missing' || transcribeBlockedCode === 'sidecar_missing') && phase === 'quick_clean'"
      to="/help"
      class="app-link text-xs underline"
    >
      {{ t("audio.error_sidecar_missing_action") }}
    </RouterLink>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
