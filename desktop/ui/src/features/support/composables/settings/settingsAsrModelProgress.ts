import type { Ref } from "vue";
import type { DownloadProgress } from "@/features/support/composables/settings/settingsAsrModelState";

/**
 * Creates and returns the create download progress queue contract.
 */
export function createDownloadProgressQueue(downloadProgress: Ref<Record<string, DownloadProgress>>) {
  const DOWNLOAD_PROGRESS_UI_FLUSH_MS = 80;
  let downloadProgressFlushTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingDownloadProgress: Record<string, DownloadProgress> = {};

  function flushPendingDownloadProgress() {
    const updates = Object.entries(pendingDownloadProgress);
    if (updates.length === 0) {
      return;
    }
    const next = { ...downloadProgress.value };
    let changed = false;
    for (const [modelId, progress] of updates) {
      delete pendingDownloadProgress[modelId];
      const current = next[modelId];
      if (
        current &&
        current.downloadedBytes === progress.downloadedBytes &&
        current.totalBytes === progress.totalBytes
      ) {
        continue;
      }
      next[modelId] = progress;
      changed = true;
    }
    if (changed) {
      downloadProgress.value = next;
    }
  }

  function queueDownloadProgress(modelId: string, downloadedBytes: number, totalBytes: number) {
    pendingDownloadProgress[modelId] = { downloadedBytes, totalBytes };
    if (downloadProgressFlushTimer !== null) {
      return;
    }
    downloadProgressFlushTimer = setTimeout(() => {
      downloadProgressFlushTimer = null;
      flushPendingDownloadProgress();
    }, DOWNLOAD_PROGRESS_UI_FLUSH_MS);
  }

  function clearPendingProgress() {
    if (downloadProgressFlushTimer !== null) {
      clearTimeout(downloadProgressFlushTimer);
      downloadProgressFlushTimer = null;
    }
    for (const key of Object.keys(pendingDownloadProgress)) {
      delete pendingDownloadProgress[key];
    }
  }

  function clearModelProgress(modelId: string) {
    delete pendingDownloadProgress[modelId];
    const next = { ...downloadProgress.value };
    delete next[modelId];
    downloadProgress.value = next;
  }

  return {
    queueDownloadProgress,
    clearPendingProgress,
    clearModelProgress,
  };
}
