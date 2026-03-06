/* eslint-disable @typescript-eslint/no-explicit-any */
import { onBeforeUnmount, onMounted, watch } from "vue";
import { listen } from "@tauri-apps/api/event";
import { hasTauriRuntime } from "@/lib/runtime";
import {
  AsrCommitEventSchema,
  AsrFinalProgressEventSchema,
  AsrFinalResultEventSchema,
  AsrPartialEventSchema,
  RecordingTelemetryEventSchema,
} from "@/schemas/ipc";
import {
  mapStageToLabel,
  peaksChanged,
  applyQualityHint,
  registerTelemetryObservation,
} from "@/components/recorder/composables/audioRecorderCaptureRuntime";

type RuntimeDeps = {
  [key: string]: any;
};

type CleanupSet = {
  unlistenProgress: (() => void) | null;
  unlistenCompleted: (() => void) | null;
  unlistenFailed: (() => void) | null;
  unlistenAsrPartial: (() => void) | null;
  unlistenAsrCommit: (() => void) | null;
  unlistenAsrFinalProgress: (() => void) | null;
  unlistenAsrFinalResult: (() => void) | null;
  unlistenRecordingTelemetry: (() => void) | null;
};

async function registerRuntimeListeners(getDeps: () => RuntimeDeps, cleanups: CleanupSet) {
  if (!hasTauriRuntime()) {
    return;
  }

  cleanups.unlistenProgress = await listen("job:progress", (event) => {
    const scopedDeps = getDeps();
    const payload = event.payload as { jobId: string; stage: string; pct: number; message?: string };
    if (scopedDeps.transcribeJobId.value && payload.jobId !== scopedDeps.transcribeJobId.value) {
      return;
    }
    if (!scopedDeps.transcribeJobId.value) {
      scopedDeps.transcribeJobId.value = payload.jobId;
    }
    scopedDeps.transcribeProgress.value = payload.pct;
    scopedDeps.transcribeStageLabel.value = mapStageToLabel(scopedDeps, payload.stage, payload.message);
  });

  cleanups.unlistenCompleted = await listen("job:completed", (event) => {
    const scopedDeps = getDeps();
    const payload = event.payload as { jobId: string };
    if (scopedDeps.transcribeJobId.value && payload.jobId !== scopedDeps.transcribeJobId.value) {
      return;
    }
    scopedDeps.transcribeProgress.value = 100;
  });

  cleanups.unlistenFailed = await listen("job:failed", (event) => {
    const scopedDeps = getDeps();
    const payload = event.payload as { jobId: string; errorCode: string; message: string };
    if (scopedDeps.transcribeJobId.value && payload.jobId !== scopedDeps.transcribeJobId.value) {
      return;
    }
    scopedDeps.setError(payload.message, payload.errorCode);
  });

  cleanups.unlistenRecordingTelemetry = await listen("recording/telemetry/v1", (event) => {
    const scopedDeps = getDeps();
    const parsed = RecordingTelemetryEventSchema.safeParse(event.payload);
    if (!parsed.success || !scopedDeps.recordingId.value) {
      return;
    }
    scopedDeps.telemetryReceived.value = true;
    scopedDeps.clearTelemetryFallbackTimer();
    scopedDeps.clearStatusTimer();
    scopedDeps.liveDurationSec.value = parsed.data.durationMs / 1000;
    scopedDeps.liveLevel.value = parsed.data.level;
    if (peaksChanged(parsed.data.waveformPeaks, scopedDeps.liveWaveformPeaks.value)) {
      scopedDeps.liveWaveformPeaks.value = parsed.data.waveformPeaks.slice();
    }
    applyQualityHint(scopedDeps, parsed.data.qualityHintKey);
    scopedDeps.updateNoSignalAutoStop();
    registerTelemetryObservation(scopedDeps, parsed.data);
  });

  cleanups.unlistenAsrPartial = await listen("asr/partial/v1", (event) => {
    const scopedDeps = getDeps();
    if (!scopedDeps.isRecording.value) {
      return;
    }
    const parsed = AsrPartialEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    scopedDeps.livePartial.value = parsed.data.text;
  });

  cleanups.unlistenAsrCommit = await listen("asr/commit/v1", (event) => {
    const scopedDeps = getDeps();
    const parsed = AsrCommitEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    const merged = [...scopedDeps.liveSegments.value, ...parsed.data.segments];
    scopedDeps.liveSegments.value = merged.slice(-scopedDeps.MAX_LIVE_SEGMENTS_PREVIEW);
    scopedDeps.livePartial.value = null;
  });

  cleanups.unlistenAsrFinalProgress = await listen("asr/final_progress/v1", (event) => {
    const scopedDeps = getDeps();
    const parsed = AsrFinalProgressEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    if (!scopedDeps.isTranscribing.value && !scopedDeps.transcribeJobId.value) {
      return;
    }
    const total = parsed.data.totalMs;
    if (total <= 0) {
      return;
    }
    const pct = Math.min(100, Math.round((parsed.data.processedMs / total) * 100));
    scopedDeps.transcribeProgress.value = pct;
    scopedDeps.transcribeStageLabel.value = scopedDeps.t("audio.stage_final");
  });

  cleanups.unlistenAsrFinalResult = await listen("asr/final_result/v1", (event) => {
    const scopedDeps = getDeps();
    const parsed = AsrFinalResultEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    scopedDeps.transcribeProgress.value = 100;
    scopedDeps.transcribeStageLabel.value = scopedDeps.t("audio.stage_final");
    scopedDeps.liveSegments.value = [];
    scopedDeps.livePartial.value = null;
    const current = scopedDeps.transcript.value;
    scopedDeps.transcript.value = {
      schema_version: "1.0.0",
      language: current?.language ?? "und",
      model_id: current?.model_id ?? null,
      duration_ms: current?.duration_ms ?? null,
      segments: parsed.data.segments,
    };
  });
}

export function bindAudioRecorderMountedHooks(getDeps: () => RuntimeDeps) {
  const cleanups: CleanupSet = {
    unlistenProgress: null,
    unlistenCompleted: null,
    unlistenFailed: null,
    unlistenAsrPartial: null,
    unlistenAsrCommit: null,
    unlistenAsrFinalProgress: null,
    unlistenAsrFinalResult: null,
    unlistenRecordingTelemetry: null,
  };

  onMounted(async () => {
    const deps = getDeps();
    deps.clearDeferredBackgroundCheckTimer();
    deps.setDeferredBackgroundCheckTimer(window.setTimeout(() => {
      const scopedDeps = getDeps();
      scopedDeps.setDeferredBackgroundCheckTimer(null);
      if (scopedDeps.advancedOpen.value) {
        void scopedDeps.refreshInputDevices();
        void scopedDeps.refreshTelemetryBudget();
      }
    }, deps.DEFERRED_BACKGROUND_CHECK_MS));
    window.addEventListener("keydown", deps.handleShortcut);
    await registerRuntimeListeners(getDeps, cleanups);
  });

  onBeforeUnmount(() => {
    const deps = getDeps();
    deps.clearStatusTimer();
    deps.clearTelemetryFallbackTimer();
    deps.clearDeferredBackgroundCheckTimer();
    window.removeEventListener("keydown", deps.handleShortcut);
    cleanups.unlistenProgress?.();
    cleanups.unlistenCompleted?.();
    cleanups.unlistenFailed?.();
    cleanups.unlistenRecordingTelemetry?.();
    cleanups.unlistenAsrPartial?.();
    cleanups.unlistenAsrCommit?.();
    cleanups.unlistenAsrFinalProgress?.();
    cleanups.unlistenAsrFinalResult?.();
  });
}

export function bindAudioRecorderWatches(getDeps: () => RuntimeDeps) {
  watch(
    () => getDeps().transcriptionSettings.value.model,
    () => {
      const deps = getDeps();
      if (deps.phase.value !== "capture") {
        void deps.refreshTranscribeReadiness();
      }
    }
  );

  watch(
    () => getDeps().advancedOpen.value,
    (isOpen) => {
      if (!isOpen) {
        return;
      }
      const deps = getDeps();
      if (deps.inputDevices.value.length === 0 && !deps.isLoadingInputDevices.value) {
        void deps.refreshInputDevices();
      }
      if (!deps.telemetryBudget.value) {
        void deps.refreshTelemetryBudget();
      }
    }
  );

  watch(
    () => getDeps().phase.value,
    (nextPhase) => {
      if (nextPhase === "quick_clean") {
        void getDeps().refreshTranscribeReadiness();
      }
    }
  );
}



