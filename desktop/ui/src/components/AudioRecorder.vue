<script setup lang="ts">
import { computed, ref } from "vue";
import { convertFileSrc } from "@tauri-apps/api/core";
import { RouterLink } from "vue-router";
import RecorderAdvancedDrawer from "./recorder/RecorderAdvancedDrawer.vue";
import RecorderCapturePanel from "./recorder/RecorderCapturePanel.vue";
import RecorderExportPanel from "./recorder/RecorderExportPanel.vue";
import RecorderQuickCleanPanel from "./recorder/RecorderQuickCleanPanel.vue";
import { useI18n } from "../lib/i18n";
import { useUiPreferences } from "../lib/uiPreferences";
import {
  createRecorderQualityHintStabilizer,
} from "../lib/recorderQualityHint";
import {
  normalizeRecorderQualityHintKey,
  qualityGuidanceMessageKeys,
} from "../lib/recorderCalibration";
import {
  applyRecorderTransportAction,
  resolveRecorderMediaActions,
} from "../lib/recorderSession";
import {
  evaluateRecorderTelemetryBudget,
} from "../lib/recorderTelemetryBudget";
import {
  resolveRecorderTranscribeReadiness,
  resolveActiveTranscriptIdForAnalysis,
  resolveReviewState,
  resolveReviewCta,
} from "../lib/recorderFlow";
import { useTranscriptionSettings } from "../lib/transcriptionSettings";
import { appState } from "../stores/app";
import {
  type RecordingInputDevice,
  type RecordingTelemetryBudget,
  TranscriptExportFormat,
  TranscriptSegment,
  TranscriptV1,
} from "../schemas/ipc";
import {
  applyTrim as applyTrimRuntime,
  formatDuration,
  levelPercent,
  pauseRecording as pauseRecordingRuntime,
  refreshInputDevices as refreshInputDevicesRuntime,
  refreshStatus as refreshStatusRuntime,
  refreshTelemetryBudget as refreshTelemetryBudgetRuntime,
  refreshTranscribeReadiness as refreshTranscribeReadinessRuntime,
  resumeRecording as resumeRecordingRuntime,
  startRecording as startRecordingRuntime,
  stopRecording as stopRecordingRuntime,
} from "@/components/recorder/composables/audioRecorderCaptureRuntime";
import {
  autoCleanFillers as autoCleanFillersRuntime,
  backToQuickClean as backToQuickCleanRuntime,
  exportPreset as exportPresetRuntime,
  exportTranscript as exportTranscriptRuntime,
  fixPunctuation as fixPunctuationRuntime,
  goAnalyzeExport as goAnalyzeExportRuntime,
  handleCapturePrimaryAction as handleCapturePrimaryActionRuntime,
  handleOnboardingContext as handleOnboardingContextRuntime,
  handleShortcut as handleShortcutRuntime,
  handleViewFeedback as handleViewFeedbackRuntime,
  openExportPath as openExportPathRuntime,
  requestAnalyze as requestAnalyzeRuntime,
  revealRecording as revealRecordingRuntime,
  saveEditedTranscript as saveEditedTranscriptRuntime,
  transcribeRecording as transcribeRecordingRuntime,
} from "@/components/recorder/composables/audioRecorderReviewRuntime";
import {
  bindAudioRecorderMountedHooks,
  bindAudioRecorderWatches,
} from "@/components/recorder/composables/useAudioRecorderLifecycle";

type AudioStatusKey =
  | "audio.status_idle"
  | "audio.status_requesting"
  | "audio.status_recording"
  | "audio.status_encoding";

const STATUS_POLLING_INTERVAL_MS = 350;
const MAX_LIVE_SEGMENTS_PREVIEW = 48;
const DEFERRED_BACKGROUND_CHECK_MS = 1200;
const NO_SIGNAL_AUTO_STOP_DELAY_MS = 5000;
const NO_SIGNAL_AUTO_STOP_MIN_DURATION_MS = 6000;

const props = withDefaults(
  defineProps<{
    titleKey?: string;
    subtitleKey?: string;
    passLabelKey?: string;
    showPassLabel?: boolean;
    canAnalyze?: boolean;
    isAnalyzing?: boolean;
    hasAnalysisResult?: boolean;
  }>(),
  {
    titleKey: "audio.title",
    subtitleKey: "audio.subtitle",
    passLabelKey: "audio.pass_label",
    showPassLabel: true,
    canAnalyze: true,
    isAnalyzing: false,
    hasAnalysisResult: false,
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
  (event: "viewFeedback"): void;
  (
    event: "onboardingContext",
    payload: { audience: string; audienceCustom: string; goal: string; targetMinutes: number | null }
  ): void;
}>();

const activeProfileId = computed(() => appState.activeProfileId);
const phase = ref<"capture" | "quick_clean" | "analyze_export">("capture");
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

let statusTimer: number | null = null;
let telemetryFallbackTimer: number | null = null;
let deferredBackgroundCheckTimer: number | null = null;

const activeTranscriptIdForAnalysis = computed(
  () => resolveActiveTranscriptIdForAnalysis(baseTranscriptId.value, editedTranscriptId.value)
);

const canAnalyzeRecorder = computed(
  () => !!activeTranscriptIdForAnalysis.value && !!props.canAnalyze
);
const reviewState = computed(() =>
  resolveReviewState({
    hasTranscript: !!baseTranscriptId.value,
    isTranscribing: isTranscribing.value,
    hasAnalysisResult: props.hasAnalysisResult,
  })
);
const reviewCta = computed(() =>
  resolveReviewCta({
    reviewState: reviewState.value,
    canTranscribe: canTranscribe.value,
    canAnalyze: canAnalyzeRecorder.value,
    transcribeProgress: transcribeProgress.value,
  })
);
const waveformStyle = computed(() => uiSettings.value.waveformStyle);
const qualityGuidanceMessages = computed(() => {
  const hint = normalizeRecorderQualityHintKey(qualityHintKey.value);
  return qualityGuidanceMessageKeys(hint).map((key) => t(key));
});

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
const recorderMediaActions = computed(() =>
  resolveRecorderMediaActions({
    hasAudioArtifact: !!lastArtifactId.value,
    isApplyingTrim: isApplyingTrim.value,
  })
);
function pathToFileUrl(pathValue: string): string {
  const normalized = pathValue.replace(/\\/g, "/");
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }
  if (normalized.startsWith("/")) {
    return `file://${encodeURI(normalized)}`;
  }
  return `file://${encodeURI(normalized)}`;
}
const audioPreviewSources = computed(() => {
  if (!lastSavedPath.value) {
    return [] as string[];
  }
  const filePath = lastSavedPath.value;
  return [convertFileSrc(filePath), pathToFileUrl(filePath)];
});
const telemetryBudgetSummary = computed(() => {
  const report = evaluateRecorderTelemetryBudget(telemetryBudget.value, {
    eventCount: telemetryEventCount.value,
    windowMs:
      telemetryWindowStartMs.value === null
        ? 0
        : Math.max(1, Date.now() - telemetryWindowStartMs.value),
    maxPayloadBytes: telemetryMaxPayloadBytes.value,
  });
  if (report.status === "unknown" || !telemetryBudget.value) {
    return null;
  }
  const statusLabel =
    report.status === "ok"
      ? t("audio.telemetry_budget_ok")
      : t("audio.telemetry_budget_warn");
  return `${statusLabel}: ${report.eventsPerSecond.toFixed(1)} evt/s, ${report.maxPayloadBytes} B`;
});
const livePreviewLines = computed(() => {
  const committed = liveSegments.value
    .map((segment) => segment.text.trim())
    .filter((segment) => segment.length > 0);
  const partial = livePartial.value?.trim() ?? "";
  const previous = committed.length >= 2 ? committed[committed.length - 2] : null;
  const latestCommitted = committed.length > 0 ? committed[committed.length - 1] : null;
  const current =
    latestCommitted && partial
      ? `${latestCommitted} ${partial}`.trim()
      : latestCommitted || partial || null;
  return { previous, current };
});
const recBadgeLabel = computed(() => t("audio.rec_badge"));
const showRecBadge = computed(() => isRecording.value && !isPaused.value);
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
  if (qualityHintKey.value === "too_loud") {
    return "danger";
  }
  if (
    qualityHintKey.value === "too_quiet" ||
    qualityHintKey.value === "noisy_room" ||
    qualityHintKey.value === "no_signal"
  ) {
    return "warn";
  }
  return "muted";
});
const capturePrimaryAction = computed<"start" | "pause" | "resume">(() => {
  if (isRecording.value) {
    return "pause";
  }
  if (recordingId.value && isPaused.value) {
    return "resume";
  }
  return "start";
});
const capturePrimaryLabel = computed(() => {
  if (capturePrimaryAction.value === "pause") {
    return t("audio.pause");
  }
  if (capturePrimaryAction.value === "resume") {
    return t("audio.resume");
  }
  return t("audio.start");
});
const captureStopLabel = computed(() => t("audio.stop"));
const captureCanPrimary = computed(() => {
  if (!activeProfileId.value) {
    return false;
  }
  if (isStarting.value || statusKey.value.includes("encoding")) {
    return false;
  }
  return true;
});
const captureCanStop = computed(
  () => !!recordingId.value && !statusKey.value.includes("encoding") && !isStarting.value
);

function setAdvancedOpen(next: boolean) {
  advancedOpen.value = next;
}

function setSelectedInputDeviceId(next: string | null) {
  selectedInputDeviceId.value = next;
}

function applyTransport(action: "start" | "pause" | "resume" | "stop") {
  const next = applyRecorderTransportAction(
    { isRecording: isRecording.value, isPaused: isPaused.value },
    action
  );
  isRecording.value = next.isRecording;
  isPaused.value = next.isPaused;
}

function clearError() {
  error.value = null;
  errorCode.value = null;
}

function setError(message: string, code: string | null = null) {
  error.value = message;
  errorCode.value = code;
}

function updateNoSignalAutoStop() {
  if (!isRecording.value || isPaused.value || statusKey.value !== "audio.status_recording") {
    noSignalSinceMs.value = null;
    return;
  }
  if (qualityHintKey.value !== "no_signal") {
    noSignalSinceMs.value = null;
    return;
  }
  const now = Date.now();
  if (noSignalSinceMs.value === null) {
    noSignalSinceMs.value = now;
    return;
  }
  if (isAutoStoppingNoSignal.value) {
    return;
  }
  if (liveDurationSec.value * 1000 < NO_SIGNAL_AUTO_STOP_MIN_DURATION_MS) {
    return;
  }
  if (now - noSignalSinceMs.value < NO_SIGNAL_AUTO_STOP_DELAY_MS) {
    return;
  }
  if (!recordingId.value) {
    return;
  }
  isAutoStoppingNoSignal.value = true;
  announce(t("audio.announcement_auto_stop_no_signal"));
  void stopRecording().finally(() => {
    isAutoStoppingNoSignal.value = false;
    noSignalSinceMs.value = null;
  });
}

function resetTranscriptionState() {
  isTranscribing.value = false;
  transcribeProgress.value = 0;
  transcribeStageLabel.value = null;
  transcribeJobId.value = null;
  transcript.value = null;
  sourceTranscript.value = null;
  baseTranscriptId.value = null;
  editedTranscriptId.value = null;
  transcriptDraftText.value = "";
  exportPath.value = null;
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

function clearDeferredBackgroundCheckTimer() {
  if (deferredBackgroundCheckTimer !== null) {
    window.clearTimeout(deferredBackgroundCheckTimer);
    deferredBackgroundCheckTimer = null;
  }
}

function startStatusPollingFallback() {
  if (statusTimer || !recordingId.value) {
    return;
  }
  void refreshStatus();
  statusTimer = window.setInterval(() => {
    void refreshStatus();
  }, STATUS_POLLING_INTERVAL_MS);
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

const getRuntimeDeps = () => ({
  t,
  emit,
  DEFERRED_BACKGROUND_CHECK_MS,
  MAX_LIVE_SEGMENTS_PREVIEW,
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
  canTranscribe,
  canAnalyzeRecorder,
  activeTranscriptIdForAnalysis,
  transcriptionSettings,
  setDeferredBackgroundCheckTimer: (next: number | null) => {
    deferredBackgroundCheckTimer = next;
  },
  clearError,
  setError,
  announce,
  applyTransport,
  clearStatusTimer,
  clearTelemetryFallbackTimer,
  clearDeferredBackgroundCheckTimer,
  updateNoSignalAutoStop,
  resetTranscriptionState,
  armStatusPollingFallback,
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  refreshStatus,
  refreshInputDevices,
  refreshTelemetryBudget,
  refreshTranscribeReadiness,
  transcribeRecording,
  handleCapturePrimaryAction,
  handleShortcut,
});

const refreshStatus = () => refreshStatusRuntime(getRuntimeDeps());
const refreshTranscribeReadiness = () => refreshTranscribeReadinessRuntime(getRuntimeDeps());
const refreshInputDevices = () => refreshInputDevicesRuntime(getRuntimeDeps());
const refreshTelemetryBudget = () => refreshTelemetryBudgetRuntime(getRuntimeDeps());
const startRecording = () => startRecordingRuntime(getRuntimeDeps());
const pauseRecording = () => pauseRecordingRuntime(getRuntimeDeps());
const resumeRecording = () => resumeRecordingRuntime(getRuntimeDeps());
const stopRecording = () => stopRecordingRuntime(getRuntimeDeps());
const applyTrim = (payload: { startMs: number; endMs: number }) =>
  applyTrimRuntime(getRuntimeDeps(), payload);
const transcribeRecording = () => transcribeRecordingRuntime(getRuntimeDeps());
const saveEditedTranscript = () => saveEditedTranscriptRuntime(getRuntimeDeps());
const autoCleanFillers = () => autoCleanFillersRuntime(getRuntimeDeps());
const fixPunctuation = () => fixPunctuationRuntime(getRuntimeDeps());
const goAnalyzeExport = () => goAnalyzeExportRuntime(getRuntimeDeps());
const backToQuickClean = () => backToQuickCleanRuntime(getRuntimeDeps());
const requestAnalyze = () => requestAnalyzeRuntime(getRuntimeDeps());
const handleViewFeedback = () => handleViewFeedbackRuntime(getRuntimeDeps());
const handleOnboardingContext = (payload: {
  audience: string;
  audienceCustom: string;
  goal: string;
  targetMinutes: number | null;
}) => handleOnboardingContextRuntime(getRuntimeDeps(), payload);
const exportTranscript = (format: TranscriptExportFormat) =>
  exportTranscriptRuntime(getRuntimeDeps(), format);
const exportPreset = (preset: "presentation" | "podcast" | "voice_note") =>
  exportPresetRuntime(getRuntimeDeps(), preset);
const openExportPath = () => openExportPathRuntime(getRuntimeDeps());
const revealRecording = () => revealRecordingRuntime(getRuntimeDeps());
const handleCapturePrimaryAction = () => handleCapturePrimaryActionRuntime(getRuntimeDeps());
const handleShortcut = (event: KeyboardEvent) =>
  handleShortcutRuntime(getRuntimeDeps(), event);

bindAudioRecorderMountedHooks(getRuntimeDeps);
bindAudioRecorderWatches(getRuntimeDeps);
</script>

<template>
  <UCard class="app-panel app-panel-compact space-y-4" variant="outline">
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
      :primary-action="capturePrimaryAction"
      :stop-label="captureStopLabel"
      :can-primary="captureCanPrimary"
      :can-stop="captureCanStop"
      :duration-label="formatDuration(isRecording || isPaused ? liveDurationSec : lastDurationSec)"
      :level-percent="levelPercent(liveLevel)"
      :quality-label="qualityLabel"
      :quality-tone="qualityTone"
      :rec-badge-label="recBadgeLabel"
      :show-rec-badge="showRecBadge"
      :live-preview-previous="livePreviewLines.previous"
      :live-preview-current="livePreviewLines.current"
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
      :raw-transcript-segments="sourceTranscript?.segments ?? transcript?.segments ?? []"
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
      :can-apply-trim="recorderMediaActions.canTrim"
      :audio-preview-sources="audioPreviewSources"
      :waveform-peaks="lastWaveformPeaks"
      :waveform-style="waveformStyle"
      :review-state="reviewState"
      :review-cta="reviewCta"
      :can-analyze="canAnalyzeRecorder"
      :has-analysis-result="props.hasAnalysisResult"
      @transcribe="transcribeRecording"
      @apply-trim="applyTrim"
      @save-edited="saveEditedTranscript"
      @auto-clean-fillers="autoCleanFillers"
      @fix-punctuation="fixPunctuation"
      @open-original="revealRecording"
      @continue="goAnalyzeExport"
      @view-feedback="handleViewFeedback"
      @analyze="requestAnalyze"
      @onboarding-context="handleOnboardingContext"
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
      :input-devices="inputDevices"
      :selected-input-device-id="selectedInputDeviceId"
      :is-loading-input-devices="isLoadingInputDevices"
      :quality-guidance-messages="qualityGuidanceMessages"
      :telemetry-budget-summary="telemetryBudgetSummary"
      :diagnostics-code="errorCode ?? transcribeBlockedCode"
      @toggle="setAdvancedOpen(!advancedOpen)"
      @update:model="(value) => updateTranscriptionSettings({ model: value })"
      @update:mode="(value) => updateTranscriptionSettings({ mode: value })"
      @update:language="(value) => updateTranscriptionSettings({ language: value })"
      @update:spoken-punctuation="(value) => updateTranscriptionSettings({ spokenPunctuation: value })"
      @update:waveform-style="(value) => setWaveformStyle(value)"
      @update:selected-input-device-id="setSelectedInputDeviceId"
      @refresh-input-devices="refreshInputDevices"
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
      v-if="(errorCode === 'sidecar_missing'
        || transcribeBlockedCode === 'sidecar_missing'
        || errorCode === 'sidecar_incompatible'
        || transcribeBlockedCode === 'sidecar_incompatible')
        && phase === 'quick_clean'"
      to="/help"
      class="app-link text-xs underline"
    >
      {{ t("audio.error_sidecar_incompatible_action") }}
    </RouterLink>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </UCard>
</template>

