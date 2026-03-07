import { listen } from "@tauri-apps/api/event";
import { mapStageToLabel } from "@/components/recorder/composables/audioRecorderCaptureRuntime";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import type { AudioRecorderCleanupSet } from "@/components/recorder/composables/runtime/audioRecorderRuntimeListenerTypes";

export async function registerJobLifecycleListeners(
  getDeps: () => AudioRecorderRuntimeDeps,
  cleanups: AudioRecorderCleanupSet
) {
  const [unlistenProgress, unlistenCompleted, unlistenFailed] = await Promise.all([
    listen("job:progress", (event) => {
      const scopedDeps = getDeps();
      const payload = event.payload as { jobId: string; stage: string; pct: number; message?: string };
      if (scopedDeps.transcribeJobId.value && payload.jobId !== scopedDeps.transcribeJobId.value) {
        return;
      }
      if (!scopedDeps.transcribeJobId.value) {
        scopedDeps.transcribeJobId.value = payload.jobId;
      }
      scopedDeps.transcribeProgress.value = payload.pct;
      scopedDeps.transcribeStageLabel.value = mapStageToLabel(scopedDeps, payload.stage, payload.message);
    }),
    listen("job:completed", (event) => {
      const scopedDeps = getDeps();
      const payload = event.payload as { jobId: string };
      if (scopedDeps.transcribeJobId.value && payload.jobId !== scopedDeps.transcribeJobId.value) {
        return;
      }
      scopedDeps.transcribeProgress.value = 100;
    }),
    listen("job:failed", (event) => {
      const scopedDeps = getDeps();
      const payload = event.payload as { jobId: string; errorCode: string; message: string };
      if (scopedDeps.transcribeJobId.value && payload.jobId !== scopedDeps.transcribeJobId.value) {
        return;
      }
      scopedDeps.setError(payload.message, payload.errorCode);
    }),
  ]);

  cleanups.unlistenProgress = unlistenProgress;
  cleanups.unlistenCompleted = unlistenCompleted;
  cleanups.unlistenFailed = unlistenFailed;
}
