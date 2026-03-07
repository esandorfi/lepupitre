import { onBeforeUnmount, onMounted } from "vue";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import {
  bindAudioRecorderRuntimeWatches,
} from "@/components/recorder/composables/runtime/audioRecorderRuntimeWatches";
import {
  cleanupAudioRecorderListeners,
  createAudioRecorderCleanupSet,
  registerAudioRecorderRuntimeListeners,
} from "@/components/recorder/composables/runtime/audioRecorderRuntimeListeners";

export function bindAudioRecorderMountedHooks(getDeps: () => AudioRecorderRuntimeDeps) {
  const cleanups = createAudioRecorderCleanupSet();

  onMounted(async () => {
    const deps = getDeps();
    deps.clearDeferredBackgroundCheckTimer();
    deps.setDeferredBackgroundCheckTimer(
      window.setTimeout(() => {
        const scopedDeps = getDeps();
        scopedDeps.setDeferredBackgroundCheckTimer(null);
        void scopedDeps.refreshInputDevices();
        if (scopedDeps.advancedOpen.value) {
          void scopedDeps.refreshTelemetryBudget();
        }
      }, deps.DEFERRED_BACKGROUND_CHECK_MS)
    );
    window.addEventListener("keydown", deps.handleShortcut);
    await registerAudioRecorderRuntimeListeners(getDeps, cleanups);
  });

  onBeforeUnmount(() => {
    const deps = getDeps();
    deps.clearStatusTimer();
    deps.clearTelemetryFallbackTimer();
    deps.clearDeferredBackgroundCheckTimer();
    window.removeEventListener("keydown", deps.handleShortcut);
    cleanupAudioRecorderListeners(cleanups);
  });
}

export function bindAudioRecorderWatches(getDeps: () => AudioRecorderRuntimeDeps) {
  bindAudioRecorderRuntimeWatches(getDeps);
}
