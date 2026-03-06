import { recorderStopTransitionPlan } from "@/lib/recorderFlow";
import { recordRecorderHealthEvent } from "@/lib/recorderHealthMetrics";
import { recordingStop } from "@/domains/recorder/api";
import { refreshTranscribeReadiness } from "@/components/recorder/composables/runtime/audioRecorderCaptureReadiness";
import { resolveRecorderHealthErrorCode } from "@/components/recorder/composables/runtime/audioRecorderCaptureUtils";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

const AUTO_TRANSCRIBE_ON_STOP = true;

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
