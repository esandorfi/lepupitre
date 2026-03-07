import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { DragDropEvent } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useI18n } from "@/lib/i18n";
import { hasTauriRuntime } from "@/lib/runtime";
import type { PackInspectResponse } from "@/schemas/ipc";
import { appState, packStore, sessionStore } from "@/stores/app";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export function usePacksPageState() {
  const { t } = useI18n();
  const error = ref<string | null>(null);
  const importPath = ref("");
  const importStatus = ref<"idle" | "importing" | "success" | "error">("idle");
  const importResult = ref<{ projectId: string; runId: string; peerReviewId: string } | null>(
    null
  );
  const importDetails = ref<PackInspectResponse | null>(null);
  const isInspecting = ref(false);
  const isPicking = ref(false);
  const isDragging = ref(false);
  let unlistenDragDrop: UnlistenFn | null = null;

  const activeProfileId = computed(() => appState.activeProfileId);

  function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "--";
    }
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  }

  async function inspectPack(path: string) {
    isInspecting.value = true;
    importDetails.value = null;
    error.value = null;
    try {
      importDetails.value = await packStore.inspectPack(path);
    } catch (err) {
      error.value = toError(err);
    } finally {
      isInspecting.value = false;
    }
  }

  async function pickPack() {
    isPicking.value = true;
    error.value = null;
    try {
      const selection = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Pack", extensions: ["zip"] }],
      });
      if (!selection || Array.isArray(selection)) {
        return;
      }
      importPath.value = selection;
      importStatus.value = "idle";
      importResult.value = null;
      await inspectPack(selection);
    } catch (err) {
      error.value = toError(err);
    } finally {
      isPicking.value = false;
    }
  }

  async function importReview() {
    if (!importPath.value.trim()) {
      error.value = t("packs.import_no_path");
      return;
    }
    if (!importDetails.value) {
      error.value = t("packs.import_invalid");
      return;
    }
    importStatus.value = "importing";
    error.value = null;
    importResult.value = null;
    try {
      const result = await packStore.importPeerReview(importPath.value.trim());
      importStatus.value = "success";
      importResult.value = {
        projectId: result.projectId,
        runId: result.runId,
        peerReviewId: result.peerReviewId,
      };
    } catch (err) {
      importStatus.value = "error";
      error.value = toError(err);
    }
  }

  function onDragDrop(event: DragDropEvent) {
    if (event.type === "enter" || event.type === "over") {
      isDragging.value = true;
      return;
    }
    if (event.type === "leave") {
      isDragging.value = false;
      return;
    }
    if (event.type !== "drop") {
      return;
    }
    isDragging.value = false;
    const zipPath = event.paths.find((path) => path.toLowerCase().endsWith(".zip"));
    if (!zipPath) {
      error.value = t("packs.import_no_path");
      return;
    }
    importPath.value = zipPath;
    importStatus.value = "idle";
    importResult.value = null;
    error.value = null;
    void inspectPack(zipPath);
  }

  onMounted(async () => {
    try {
      await sessionStore.bootstrap();
    } catch (err) {
      error.value = toError(err);
    }
    if (!hasTauriRuntime()) {
      return;
    }
    unlistenDragDrop = await getCurrentWindow().onDragDropEvent((event) => {
      onDragDrop(event.payload);
    });
  });

  onBeforeUnmount(() => {
    if (unlistenDragDrop) {
      unlistenDragDrop();
      unlistenDragDrop = null;
    }
  });

  return {
    t,
    error,
    importPath,
    importStatus,
    importResult,
    importDetails,
    isInspecting,
    isPicking,
    isDragging,
    activeProfileId,
    formatBytes,
    pickPack,
    importReview,
  };
}
