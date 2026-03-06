/* eslint-disable @typescript-eslint/no-explicit-any */
import { classifyAsrError } from "@/lib/asrErrors";
import { recordRecorderHealthEvent } from "@/lib/recorderHealthMetrics";
import {
  createRecorderQualityHintStabilizer,
  normalizeRecorderQualityHint,
  updateRecorderQualityHint,
} from "@/lib/recorderQualityHint";
import { buildRecordingStartPayload } from "@/lib/asrPayloads";
import { estimateTelemetryPayloadBytes } from "@/lib/recorderTelemetryBudget";
import { recorderStopTransitionPlan } from "@/lib/recorderFlow";
import {
  audioTrimWav,
  listRecordingInputDevices,
  recordingPause,
  recordingResume,
  recordingStart,
  recordingStatus,
  recordingStop,
  recordingTelemetryBudget,
} from "@/domains/recorder/api";
import { asrModelVerify, asrSidecarStatus } from "@/domains/asr/api";
import type { TranscriptV1 } from "@/schemas/ipc";

type RuntimeDeps = {
  [key: string]: any;
};

const AUTO_TRANSCRIBE_ON_STOP = true;

export function mapStageToLabel(deps: RuntimeDeps, stage: string | null, message?: string | null) {
  if (message) {
    switch (message) {
      case "queued":
        return deps.t("audio.stage_queued");
      case "analyze_audio":
        return deps.t("audio.stage_analyze");
      case "serialize":
        return deps.t("audio.stage_serialize");
      case "done":
        return deps.t("audio.stage_done");
      default:
        break;
    }
  }
  if (!stage) {
    return null;
  }
  if (stage === "transcribe") {
    return deps.t("audio.stage_transcribe");
  }
  return deps.t("audio.stage_processing");
}

export function resetLiveTranscript(deps: RuntimeDeps) {
  deps.liveSegments.value = [];
  deps.livePartial.value = null;
}

export function resetQualityHintState(deps: RuntimeDeps) {
  deps.qualityHintStabilizer.value = createRecorderQualityHintStabilizer("good_level");
  deps.qualityHintKey.value = "good_level";
}

export function applyQualityHint(deps: RuntimeDeps, rawHint: string | null | undefined) {
  const normalized = normalizeRecorderQualityHint(rawHint);
  deps.qualityHintKey.value = updateRecorderQualityHint(
    deps.qualityHintStabilizer.value,
    normalized,
    Date.now()
  );
}

export function formatDuration(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "0:00";
  }
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function levelPercent(value: number) {
  return Math.max(0, Math.min(1, value)) * 100;
}

export function transcriptToEditorText(value: TranscriptV1): string {
  return value.segments.map((segment) => segment.text.trim()).join("\n").trim();
}

export function resolveRecorderHealthErrorCode(raw: string): string | null {
  const asrCode = classifyAsrError(raw);
  if (asrCode) {
    return asrCode;
  }
  const match = raw.toLowerCase().match(/\b[a-z]+(?:_[a-z0-9]+){1,}\b/);
  return match?.[0] ?? null;
}

export function peaksChanged(next: number[], current: number[], epsilon = 0.01): boolean {
  if (next.length !== current.length) {
    return true;
  }
  for (let index = 0; index < next.length; index += 1) {
    if (Math.abs((next[index] ?? 0) - (current[index] ?? 0)) > epsilon) {
      return true;
    }
  }
  return false;
}

export async function refreshStatus(deps: RuntimeDeps) {
  const currentRecordingId = deps.recordingId.value;
  if (!currentRecordingId) {
    return;
  }
  try {
    const status = await recordingStatus(currentRecordingId);
    if (deps.recordingId.value !== currentRecordingId) {
      return;
    }
    deps.liveDurationSec.value = status.durationMs / 1000;
    deps.liveLevel.value = status.level;
    deps.isPaused.value = status.isPaused ?? false;
    applyQualityHint(deps, status.qualityHintKey);
    deps.updateNoSignalAutoStop();
  } catch (err) {
    if (deps.recordingId.value !== currentRecordingId) {
      return;
    }
    deps.setError(err instanceof Error ? err.message : String(err));
  }
}

export async function refreshTranscribeReadiness(deps: RuntimeDeps) {
  deps.transcribeBlockedCode.value = null;
  deps.transcribeBlockedMessage.value = null;
  deps.clearError();

  try {
    await asrSidecarStatus();
  } catch (err) {
    const code = classifyAsrError(err instanceof Error ? err.message : String(err));
    if (code === "sidecar_missing") {
      deps.transcribeBlockedCode.value = code;
      deps.transcribeBlockedMessage.value = deps.t("audio.error_sidecar_missing");
      return;
    }
    if (code === "sidecar_incompatible") {
      deps.transcribeBlockedCode.value = code;
      deps.transcribeBlockedMessage.value = deps.t("audio.error_sidecar_incompatible");
      return;
    }
  }

  try {
    const model = deps.transcriptionSettings.value.model ?? "tiny";
    const verified = await asrModelVerify(model);
    if (!verified.installed || verified.checksum_ok === false) {
      deps.transcribeBlockedCode.value = "model_missing";
      deps.transcribeBlockedMessage.value = deps.t("audio.error_model_missing");
    }
  } catch (err) {
    const code = classifyAsrError(err instanceof Error ? err.message : String(err));
    if (code === "model_missing") {
      deps.transcribeBlockedCode.value = code;
      deps.transcribeBlockedMessage.value = deps.t("audio.error_model_missing");
    }
  }
}

export async function refreshInputDevices(deps: RuntimeDeps) {
  deps.isLoadingInputDevices.value = true;
  try {
    const devices = await listRecordingInputDevices();
    deps.inputDevices.value = devices;
    if (devices.length === 0) {
      deps.selectedInputDeviceId.value = null;
      return;
    }
    const existing = deps.selectedInputDeviceId.value;
    if (existing && devices.some((device) => device.id === existing)) {
      return;
    }
    deps.selectedInputDeviceId.value =
      devices.find((device) => device.isDefault)?.id ?? devices[0]?.id ?? null;
  } catch {
    deps.inputDevices.value = [];
    deps.selectedInputDeviceId.value = null;
  } finally {
    deps.isLoadingInputDevices.value = false;
  }
}

export async function refreshTelemetryBudget(deps: RuntimeDeps) {
  try {
    deps.telemetryBudget.value = await recordingTelemetryBudget();
  } catch {
    deps.telemetryBudget.value = null;
  }
}

export function resetTelemetryObservation(deps: RuntimeDeps) {
  deps.telemetryWindowStartMs.value = null;
  deps.telemetryEventCount.value = 0;
  deps.telemetryMaxPayloadBytes.value = 0;
}

export function registerTelemetryObservation(deps: RuntimeDeps, payload: unknown) {
  if (deps.telemetryWindowStartMs.value === null) {
    deps.telemetryWindowStartMs.value = Date.now();
  }
  deps.telemetryEventCount.value += 1;
  deps.telemetryMaxPayloadBytes.value = Math.max(
    deps.telemetryMaxPayloadBytes.value,
    estimateTelemetryPayloadBytes(payload)
  );
}

export async function startRecording(deps: RuntimeDeps) {
  if (deps.isStarting.value) {
    return;
  }
  deps.isStarting.value = true;
  deps.clearError();
  if (!deps.activeProfileId.value) {
    deps.setError(deps.t("audio.profile_required"));
    deps.isStarting.value = false;
    return;
  }
  deps.lastSavedPath.value = null;
  deps.lastArtifactId.value = null;
  deps.lastDurationSec.value = null;
  deps.liveDurationSec.value = 0;
  deps.liveLevel.value = 0;
  resetQualityHintState(deps);
  deps.statusKey.value = "audio.status_requesting";
  deps.phase.value = "capture";
  deps.resetTranscriptionState();
  resetLiveTranscript(deps);
  deps.liveWaveformPeaks.value = [];
  deps.lastWaveformPeaks.value = [];
  resetTelemetryObservation(deps);

  try {
    const result = await recordingStart(
      buildRecordingStartPayload(
        deps.activeProfileId.value,
        deps.transcriptionSettings.value,
        deps.selectedInputDeviceId.value
      )
    );
    deps.recordingId.value = result.recordingId;
    deps.applyTransport("start");
    deps.telemetryReceived.value = false;
    deps.statusKey.value = "audio.status_recording";
    deps.clearStatusTimer();
    deps.armStatusPollingFallback(result.recordingId);
    deps.announce(deps.t("audio.announcement_started"));
    recordRecorderHealthEvent("start_success");
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    deps.setError(raw);
    recordRecorderHealthEvent("start_failure", {
      errorCode: resolveRecorderHealthErrorCode(raw),
    });
    deps.statusKey.value = "audio.status_idle";
  } finally {
    deps.isStarting.value = false;
  }
}

export async function pauseRecording(deps: RuntimeDeps) {
  if (!deps.recordingId.value || !deps.isRecording.value) {
    return;
  }
  try {
    await recordingPause(deps.recordingId.value);
    deps.applyTransport("pause");
    deps.statusKey.value = "audio.status_recording";
    deps.announce(deps.t("audio.announcement_paused"));
  } catch (err) {
    deps.setError(err instanceof Error ? err.message : String(err));
  }
}

export async function resumeRecording(deps: RuntimeDeps) {
  if (!deps.recordingId.value || !deps.isPaused.value) {
    return;
  }
  try {
    await recordingResume(deps.recordingId.value);
    deps.applyTransport("resume");
    deps.statusKey.value = "audio.status_recording";
    deps.announce(deps.t("audio.announcement_resumed"));
  } catch (err) {
    deps.setError(err instanceof Error ? err.message : String(err));
  }
}

export async function stopRecording(deps: RuntimeDeps) {
  if (
    !deps.recordingId.value
    || !deps.activeProfileId.value
    || deps.statusKey.value === "audio.status_encoding"
  ) {
    return;
  }
  let stopCompleted = false;
  deps.applyTransport("stop");
  deps.statusKey.value = "audio.status_encoding";
  deps.clearStatusTimer();
  deps.clearTelemetryFallbackTimer();

  try {
    const result = await recordingStop(deps.activeProfileId.value, deps.recordingId.value);
    deps.lastSavedPath.value = result.path;
    deps.lastArtifactId.value = result.artifactId;
    deps.lastDurationSec.value = result.durationMs / 1000;
    deps.lastWaveformPeaks.value = deps.liveWaveformPeaks.value.slice();
    deps.emit("saved", { artifactId: result.artifactId, path: result.path });
    stopCompleted = true;
    recordRecorderHealthEvent("stop_success");
    deps.liveLevel.value = 0;
    deps.statusKey.value = "audio.status_idle";
    const stopPlan = recorderStopTransitionPlan(AUTO_TRANSCRIBE_ON_STOP, false);
    deps.phase.value = stopPlan.nextPhase;
    deps.announce(deps.t("audio.announcement_stopped"));

    void refreshTranscribeReadiness(deps).then(() => {
      if (recorderStopTransitionPlan(AUTO_TRANSCRIBE_ON_STOP, deps.canTranscribe.value).shouldAutoTranscribe) {
        void deps.transcribeRecording();
      }
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    deps.setError(raw);
    if (!stopCompleted) {
      recordRecorderHealthEvent("stop_failure", {
        errorCode: resolveRecorderHealthErrorCode(raw),
      });
    }
    deps.statusKey.value = "audio.status_idle";
  } finally {
    deps.recordingId.value = null;
    deps.telemetryReceived.value = false;
    deps.noSignalSinceMs.value = null;
    deps.isAutoStoppingNoSignal.value = false;
  }
}

export async function applyTrim(deps: RuntimeDeps, payload: { startMs: number; endMs: number }) {
  deps.clearError();
  if (!deps.activeProfileId.value || !deps.lastArtifactId.value) {
    return;
  }
  if (deps.isApplyingTrim.value) {
    return;
  }

  deps.isApplyingTrim.value = true;
  try {
    const result = await audioTrimWav({
      profileId: deps.activeProfileId.value,
      audioArtifactId: deps.lastArtifactId.value,
      startMs: payload.startMs,
      endMs: payload.endMs,
    });
    deps.lastSavedPath.value = result.path;
    deps.lastArtifactId.value = result.artifactId;
    deps.lastDurationSec.value = result.durationMs / 1000;
    deps.resetTranscriptionState();
    deps.lastWaveformPeaks.value = [];
    deps.emit("saved", { artifactId: result.artifactId, path: result.path });
    deps.announce(deps.t("audio.quick_clean_trim_applied"));
    await refreshTranscribeReadiness(deps);
    recordRecorderHealthEvent("trim_success");
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    deps.setError(raw);
    recordRecorderHealthEvent("trim_failure", {
      errorCode: resolveRecorderHealthErrorCode(raw),
    });
  } finally {
    deps.isApplyingTrim.value = false;
  }
}


