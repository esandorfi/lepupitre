import { onBeforeUnmount, onMounted } from "vue";
import { listen } from "@tauri-apps/api/event";
import { hasTauriRuntime } from "@/lib/runtime";
import { AsrModelDownloadProgressEventSchema } from "@/schemas/ipc";
import { createDownloadProgressQueue } from "@/features/support/composables/settings/useSettingsAsrModelHelpers";

/**
 * Binds lifecycle/effect wiring for bind asr model lifecycle.
 */
export function bindAsrModelLifecycle(
  progressQueue: ReturnType<typeof createDownloadProgressQueue>,
  refreshModels: () => Promise<void>,
  refreshSidecarStatus: () => Promise<void>
) {
  let unlistenDownloadProgress: (() => void) | null = null;

  onMounted(async () => {
    await refreshModels();
    await refreshSidecarStatus();
    if (!hasTauriRuntime()) {
      return;
    }
    unlistenDownloadProgress = await listen("asr/model_download_progress/v1", (event) => {
      const parsed = AsrModelDownloadProgressEventSchema.safeParse(event.payload);
      if (!parsed.success) {
        return;
      }
      progressQueue.queueDownloadProgress(
        parsed.data.modelId,
        parsed.data.downloadedBytes,
        parsed.data.totalBytes
      );
    });
  });

  onBeforeUnmount(() => {
    progressQueue.clearPendingProgress();
    unlistenDownloadProgress?.();
  });
}
