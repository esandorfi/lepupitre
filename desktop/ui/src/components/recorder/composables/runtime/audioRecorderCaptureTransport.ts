import { buildRecordingStartPayload } from "@/lib/asrPayloads";
import { recorderStopTransitionPlan } from "@/lib/recorderFlow";
import { recordRecorderHealthEvent } from "@/lib/recorderHealthMetrics";
import {
  audioTrimWav,
  recordingPause,
  recordingResume,
  recordingStart,
  recordingStop,
} from "@/domains/recorder/api";
import { refreshTranscribeReadiness } from "@/components/recorder/composables/runtime/audioRecorderCaptureReadiness";
import {
  resetLiveTranscript,
  resetQualityHintState,
  resetTelemetryObservation,
  resolveRecorderHealthErrorCode,
} from "@/components/recorder/composables/runtime/audioRecorderCaptureUtils";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

const AUTO_TRANSCRIBE_ON_STOP = true;

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

export async function stopRecording(deps: AudioRecorderRuntimeDeps) {
  if (
    !deps.recordingId.value ||
    !deps.activeProfileId.value ||
    deps.statusKey.value === "audio.status_encoding"
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
      if (
        recorderStopTransitionPlan(AUTO_TRANSCRIBE_ON_STOP, deps.canTranscribe.value)
          .shouldAutoTranscribe
      ) {
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

export async function applyTrim(
  deps: AudioRecorderRuntimeDeps,
  payload: { startMs: number; endMs: number }
) {
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
