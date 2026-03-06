import { computed, type Ref } from "vue";
import { convertFileSrc } from "@tauri-apps/api/core";
import { normalizeRecorderQualityHintKey, qualityGuidanceMessageKeys } from "@/lib/recorderCalibration";
import { resolveRecorderMediaActions } from "@/lib/recorderSession";
import { evaluateRecorderTelemetryBudget } from "@/lib/recorderTelemetryBudget";
import {
  resolveActiveTranscriptIdForAnalysis,
  resolveRecorderTranscribeReadiness,
  resolveReviewCta,
  resolveReviewState,
} from "@/lib/recorderFlow";
import type { UiSettings } from "@/lib/uiPreferences";
import type { AudioRecorderState } from "@/components/recorder/composables/useAudioRecorderState";

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

function createQualityPresentation(state: AudioRecorderState, t: (key: string) => string) {
  const qualityGuidanceMessages = computed(() => {
    const hint = normalizeRecorderQualityHintKey(state.qualityHintKey.value);
    return qualityGuidanceMessageKeys(hint).map((key) => t(key));
  });
  const recBadgeLabel = computed(() => t("audio.rec_badge"));
  const showRecBadge = computed(() => state.isRecording.value && !state.isPaused.value);
  const qualityLabel = computed(() => {
    if (state.qualityHintKey.value === "no_signal") {
      return t("audio.quality_no_signal");
    }
    if (state.qualityHintKey.value === "too_loud") {
      return t("audio.quality_too_loud");
    }
    if (state.qualityHintKey.value === "noisy_room") {
      return t("audio.quality_noisy_room");
    }
    if (state.qualityHintKey.value === "too_quiet") {
      return t("audio.quality_too_quiet");
    }
    return t("audio.quality_good_level");
  });
  const qualityTone = computed<"good" | "warn" | "danger" | "muted">(() => {
    if (state.qualityHintKey.value === "good_level") {
      return "good";
    }
    if (state.qualityHintKey.value === "too_loud") {
      return "danger";
    }
    if (
      state.qualityHintKey.value === "too_quiet" ||
      state.qualityHintKey.value === "noisy_room" ||
      state.qualityHintKey.value === "no_signal"
    ) {
      return "warn";
    }
    return "muted";
  });

  return {
    qualityGuidanceMessages,
    recBadgeLabel,
    showRecBadge,
    qualityLabel,
    qualityTone,
  };
}

function createCaptureControls(state: AudioRecorderState, t: (key: string) => string) {
  const capturePrimaryAction = computed<"start" | "pause" | "resume">(() => {
    if (state.isRecording.value) {
      return "pause";
    }
    if (state.recordingId.value && state.isPaused.value) {
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
    if (!state.activeProfileId.value) {
      return false;
    }
    if (state.isStarting.value || state.statusKey.value.includes("encoding")) {
      return false;
    }
    return true;
  });
  const captureCanStop = computed(
    () => !!state.recordingId.value && !state.statusKey.value.includes("encoding") && !state.isStarting.value
  );

  return {
    capturePrimaryAction,
    capturePrimaryLabel,
    captureStopLabel,
    captureCanPrimary,
    captureCanStop,
  };
}

export function useAudioRecorderPresentation(params: {
  state: AudioRecorderState;
  t: (key: string) => string;
  uiSettings: Ref<UiSettings>;
  canAnalyze: Ref<boolean>;
  hasAnalysisResult: Ref<boolean>;
}) {
  const { state, t, uiSettings, canAnalyze, hasAnalysisResult } = params;

  const activeTranscriptIdForAnalysis = computed(() =>
    resolveActiveTranscriptIdForAnalysis(state.baseTranscriptId.value, state.editedTranscriptId.value)
  );
  const canAnalyzeRecorder = computed(
    () => !!activeTranscriptIdForAnalysis.value && !!canAnalyze.value
  );
  const reviewState = computed(() =>
    resolveReviewState({
      hasTranscript: !!state.baseTranscriptId.value,
      isTranscribing: state.isTranscribing.value,
      hasAnalysisResult: hasAnalysisResult.value,
    })
  );
  const transcribeReadiness = computed(() =>
    resolveRecorderTranscribeReadiness({
      hasAudioArtifact: !!state.lastArtifactId.value,
      isTranscribing: state.isTranscribing.value,
      isApplyingTrim: state.isApplyingTrim.value,
      transcribeBlockedCode: state.transcribeBlockedCode.value,
    })
  );
  const canTranscribe = computed(() => transcribeReadiness.value.canTranscribe);
  const reviewCta = computed(() =>
    resolveReviewCta({
      reviewState: reviewState.value,
      canTranscribe: canTranscribe.value,
      canAnalyze: canAnalyzeRecorder.value,
      transcribeProgress: state.transcribeProgress.value,
    })
  );
  const waveformStyle = computed(() => uiSettings.value.waveformStyle);
  const { qualityGuidanceMessages, recBadgeLabel, showRecBadge, qualityLabel, qualityTone } =
    createQualityPresentation(state, t);
  const canExport = computed(() => !!activeTranscriptIdForAnalysis.value);
  const canOpenOriginal = computed(() => !!state.lastSavedPath.value);
  const recorderMediaActions = computed(() =>
    resolveRecorderMediaActions({
      hasAudioArtifact: !!state.lastArtifactId.value,
      isApplyingTrim: state.isApplyingTrim.value,
    })
  );
  const audioPreviewSources = computed(() => {
    if (!state.lastSavedPath.value) {
      return [] as string[];
    }
    const filePath = state.lastSavedPath.value;
    return [convertFileSrc(filePath), pathToFileUrl(filePath)];
  });
  const telemetryBudgetSummary = computed(() => {
    const report = evaluateRecorderTelemetryBudget(state.telemetryBudget.value, {
      eventCount: state.telemetryEventCount.value,
      windowMs:
        state.telemetryWindowStartMs.value === null
          ? 0
          : Math.max(1, Date.now() - state.telemetryWindowStartMs.value),
      maxPayloadBytes: state.telemetryMaxPayloadBytes.value,
    });
    if (report.status === "unknown" || !state.telemetryBudget.value) {
      return null;
    }
    const statusLabel =
      report.status === "ok" ? t("audio.telemetry_budget_ok") : t("audio.telemetry_budget_warn");
    return `${statusLabel}: ${report.eventsPerSecond.toFixed(1)} evt/s, ${report.maxPayloadBytes} B`;
  });
  const livePreviewLines = computed(() => {
    const committed = state.liveSegments.value
      .map((segment) => segment.text.trim())
      .filter((segment) => segment.length > 0);
    const partial = state.livePartial.value?.trim() ?? "";
    const previous = committed.length >= 2 ? committed[committed.length - 2] : null;
    const latestCommitted = committed.length > 0 ? committed[committed.length - 1] : null;
    const current =
      latestCommitted && partial
        ? `${latestCommitted} ${partial}`.trim()
        : latestCommitted || partial || null;
    return { previous, current };
  });
  const {
    capturePrimaryAction,
    capturePrimaryLabel,
    captureStopLabel,
    captureCanPrimary,
    captureCanStop,
  } = createCaptureControls(state, t);

  return {
    activeTranscriptIdForAnalysis,
    canAnalyzeRecorder,
    reviewState,
    reviewCta,
    waveformStyle,
    qualityGuidanceMessages,
    canExport,
    transcribeReadiness,
    canTranscribe,
    canOpenOriginal,
    recorderMediaActions,
    audioPreviewSources,
    telemetryBudgetSummary,
    livePreviewLines,
    recBadgeLabel,
    showRecBadge,
    qualityLabel,
    qualityTone,
    capturePrimaryAction,
    capturePrimaryLabel,
    captureStopLabel,
    captureCanPrimary,
    captureCanStop,
  };
}
