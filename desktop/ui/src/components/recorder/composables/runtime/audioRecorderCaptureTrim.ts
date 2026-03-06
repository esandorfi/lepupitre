import { recordRecorderHealthEvent } from "@/lib/recorderHealthMetrics";
import { audioTrimWav } from "@/domains/recorder/api";
import { refreshTranscribeReadiness } from "@/components/recorder/composables/runtime/audioRecorderCaptureReadiness";
import { resolveRecorderHealthErrorCode } from "@/components/recorder/composables/runtime/audioRecorderCaptureUtils";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

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
