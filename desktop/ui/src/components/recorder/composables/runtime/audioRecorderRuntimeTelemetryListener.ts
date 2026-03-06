import { listen } from "@tauri-apps/api/event";
import { RecordingTelemetryEventSchema } from "@/schemas/ipc";
import {
  applyQualityHint,
  peaksChanged,
  registerTelemetryObservation,
} from "@/components/recorder/composables/audioRecorderCaptureRuntime";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import type { AudioRecorderCleanupSet } from "@/components/recorder/composables/runtime/audioRecorderRuntimeListenerTypes";

export async function registerRecordingTelemetryListener(
  getDeps: () => AudioRecorderRuntimeDeps,
  cleanups: AudioRecorderCleanupSet
) {
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
}
