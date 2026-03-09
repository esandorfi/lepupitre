import { classifyAsrError } from "@/lib/asrErrors";
import { asrModelVerify, asrSidecarStatus } from "@/domains/asr/api";
import {
  listRecordingInputDevices,
  recordingStatus,
  recordingTelemetryBudget,
} from "@/domains/recorder/api";
import { applyQualityHint } from "@/components/recorder/composables/runtime/audioRecorderCaptureUtils";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

/**
 * Implements refresh status behavior.
 */
export async function refreshStatus(deps: AudioRecorderRuntimeDeps) {
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

/**
 * Implements refresh transcribe readiness behavior.
 */
export async function refreshTranscribeReadiness(deps: AudioRecorderRuntimeDeps) {
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

/**
 * Implements refresh input devices behavior.
 */
export async function refreshInputDevices(deps: AudioRecorderRuntimeDeps) {
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

/**
 * Implements refresh telemetry budget behavior.
 */
export async function refreshTelemetryBudget(deps: AudioRecorderRuntimeDeps) {
  try {
    deps.telemetryBudget.value = await recordingTelemetryBudget();
  } catch {
    deps.telemetryBudget.value = null;
  }
}
