import { hasTauriRuntime } from "@/lib/runtime";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import type { AudioRecorderCleanupSet } from "@/components/recorder/composables/runtime/audioRecorderRuntimeListenerTypes";
import { registerJobLifecycleListeners } from "@/components/recorder/composables/runtime/audioRecorderRuntimeJobListeners";
import { registerRecordingTelemetryListener } from "@/components/recorder/composables/runtime/audioRecorderRuntimeTelemetryListener";
import { registerAsrListeners } from "@/components/recorder/composables/runtime/audioRecorderRuntimeAsrListeners";

export async function registerAudioRecorderRuntimeListeners(
  getDeps: () => AudioRecorderRuntimeDeps,
  cleanups: AudioRecorderCleanupSet
) {
  if (!hasTauriRuntime()) {
    return;
  }

  await registerJobLifecycleListeners(getDeps, cleanups);
  await registerRecordingTelemetryListener(getDeps, cleanups);
  await registerAsrListeners(getDeps, cleanups);
}
