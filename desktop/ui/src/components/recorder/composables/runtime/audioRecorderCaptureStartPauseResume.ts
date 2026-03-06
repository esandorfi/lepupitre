import { buildRecordingStartPayload } from "@/lib/asrPayloads";
import { recordRecorderHealthEvent } from "@/lib/recorderHealthMetrics";
import { recordingPause, recordingResume, recordingStart } from "@/domains/recorder/api";
import {
  resetLiveTranscript,
  resetQualityHintState,
  resetTelemetryObservation,
  resolveRecorderHealthErrorCode,
} from "@/components/recorder/composables/runtime/audioRecorderCaptureUtils";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

export async function startRecording(deps: AudioRecorderRuntimeDeps) {
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

export async function pauseRecording(deps: AudioRecorderRuntimeDeps) {
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

export async function resumeRecording(deps: AudioRecorderRuntimeDeps) {
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
