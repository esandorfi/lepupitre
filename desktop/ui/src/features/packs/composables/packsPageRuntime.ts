import type { Ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { DragDropEvent } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type { PackInspectResponse } from "@/schemas/ipc";
import { hasTauriRuntime } from "@/lib/runtime";
import { packStore, sessionStore } from "@/stores/app";
import { toError } from "@/features/packs/composables/packsPageHelpers";

type PacksPageRuntimeArgs = {
  t: (key: string) => string;
  error: Ref<string | null>;
  importPath: Ref<string>;
  importStatus: Ref<"idle" | "importing" | "success" | "error">;
  importResult: Ref<{ projectId: string; runId: string; peerReviewId: string } | null>;
  importDetails: Ref<PackInspectResponse | null>;
  isInspecting: Ref<boolean>;
  isPicking: Ref<boolean>;
  isDragging: Ref<boolean>;
};

export function createPacksPageRuntime(args: PacksPageRuntimeArgs) {
  const {
    t,
    error,
    importPath,
    importStatus,
    importResult,
    importDetails,
    isInspecting,
    isPicking,
    isDragging,
  } = args;

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

  async function bootstrap() {
    try {
      await sessionStore.bootstrap();
    } catch (err) {
      error.value = toError(err);
    }
  }

  async function attachDragDropListener() {
    if (!hasTauriRuntime()) {
      return null;
    }
    const unlisten = await getCurrentWindow().onDragDropEvent((event) => {
      onDragDrop(event.payload);
    });
    return unlisten as UnlistenFn;
  }

  return {
    pickPack,
    importReview,
    bootstrap,
    attachDragDropListener,
  };
}
