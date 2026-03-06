import { watch } from "vue";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

export function bindAudioRecorderRuntimeWatches(getDeps: () => AudioRecorderRuntimeDeps) {
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
