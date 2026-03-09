import type { Ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { DragDropEvent } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type { PackInspectResponse } from "@/schemas/ipc";
import { hasTauriRuntime } from "@/lib/runtime";
import { packStore, sessionStore } from "@/stores/app";
import {
  clearRuntimeUiError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";

type PackImportResult = { projectId: string; runId: string; peerReviewId: string };

export type PacksPageRuntimeState = {
  identity: {
    t: (key: string) => string;
  };
  model: {
    importPath: Ref<string>;
    importResult: Ref<PackImportResult | null>;
    importDetails: Ref<PackInspectResponse | null>;
  };
  ui: {
    error: Ref<string | null>;
    errorCategory?: Ref<RuntimeErrorCategory | null>;
    importStatus: Ref<"idle" | "importing" | "success" | "error">;
    isInspecting: Ref<boolean>;
    isPicking: Ref<boolean>;
    isDragging: Ref<boolean>;
  };
};

export type PacksPageRuntimeDeps = {
  openPackDialog: () => Promise<string | string[] | null>;
  inspectPack: (path: string) => Promise<PackInspectResponse>;
  importPeerReview: (
    path: string
  ) => Promise<{ projectId: string; runId: string; peerReviewId: string }>;
  bootstrapSession: () => Promise<void>;
  listenDragDrop: (handler: (payload: DragDropEvent) => void) => Promise<UnlistenFn | null>;
};

function createDefaultPacksPageRuntimeDeps(): PacksPageRuntimeDeps {
  return {
    openPackDialog: () =>
      open({
        multiple: false,
        directory: false,
        filters: [{ name: "Pack", extensions: ["zip"] }],
      }),
    inspectPack: (path) => packStore.inspectPack(path),
    importPeerReview: (path) => packStore.importPeerReview(path),
    bootstrapSession: () => sessionStore.bootstrap(),
    listenDragDrop: async (handler) => {
      if (!hasTauriRuntime()) {
        return null;
      }
      const unlisten = await getCurrentWindow().onDragDropEvent((event) => {
        handler(event.payload);
      });
      return unlisten as UnlistenFn;
    },
  };
}

type PacksPageRuntimeArgs = {
  state: PacksPageRuntimeState;
  deps?: PacksPageRuntimeDeps;
};

/**
 * Creates and returns the create packs page runtime contract.
 */
export function createPacksPageRuntime(args: PacksPageRuntimeArgs) {
  const deps = args.deps ?? createDefaultPacksPageRuntimeDeps();
  const { identity, model, ui } = args.state;
  // Policy: pickPack/importReview use singleFlight.
  let pickInFlight: Promise<void> | null = null;
  let importInFlight: Promise<void> | null = null;

  async function inspectPack(path: string) {
    ui.isInspecting.value = true;
    model.importDetails.value = null;
    clearRuntimeUiError(ui);
    try {
      model.importDetails.value = await deps.inspectPack(path);
    } catch (err) {
      setRuntimeUiError(ui, err);
    } finally {
      ui.isInspecting.value = false;
    }
  }

  async function pickPack() {
    if (pickInFlight) {
      return pickInFlight;
    }
    const run = (async () => {
      ui.isPicking.value = true;
      clearRuntimeUiError(ui);
      try {
        const selection = await deps.openPackDialog();
        if (!selection || Array.isArray(selection)) {
          return;
        }
        model.importPath.value = selection;
        ui.importStatus.value = "idle";
        model.importResult.value = null;
        await inspectPack(selection);
      } catch (err) {
        setRuntimeUiError(ui, err);
      } finally {
        ui.isPicking.value = false;
      }
    })();
    pickInFlight = run;
    await run.finally(() => {
      if (pickInFlight === run) {
        pickInFlight = null;
      }
    });
  }

  async function importReview() {
    if (importInFlight) {
      return importInFlight;
    }
    if (!model.importPath.value.trim()) {
      ui.error.value = identity.t("packs.import_no_path");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    if (!model.importDetails.value) {
      ui.error.value = identity.t("packs.import_invalid");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    const run = (async () => {
      ui.importStatus.value = "importing";
      clearRuntimeUiError(ui);
      model.importResult.value = null;
      try {
        const result = await deps.importPeerReview(model.importPath.value.trim());
        ui.importStatus.value = "success";
        model.importResult.value = {
          projectId: result.projectId,
          runId: result.runId,
          peerReviewId: result.peerReviewId,
        };
      } catch (err) {
        ui.importStatus.value = "error";
        setRuntimeUiError(ui, err);
      }
    })();
    importInFlight = run;
    await run.finally(() => {
      if (importInFlight === run) {
        importInFlight = null;
      }
    });
  }

  function onDragDrop(event: DragDropEvent) {
    if (event.type === "enter" || event.type === "over") {
      ui.isDragging.value = true;
      return;
    }
    if (event.type === "leave") {
      ui.isDragging.value = false;
      return;
    }
    if (event.type !== "drop") {
      return;
    }
    ui.isDragging.value = false;
    const zipPath = event.paths.find((path) => path.toLowerCase().endsWith(".zip"));
    if (!zipPath) {
      ui.error.value = identity.t("packs.import_no_path");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    model.importPath.value = zipPath;
    ui.importStatus.value = "idle";
    model.importResult.value = null;
    clearRuntimeUiError(ui);
    void inspectPack(zipPath);
  }

  async function bootstrap() {
    try {
      await deps.bootstrapSession();
    } catch (err) {
      setRuntimeUiError(ui, err);
    }
  }

  async function attachDragDropListener() {
    return deps.listenDragDrop(onDragDrop);
  }

  return {
    pickPack,
    importReview,
    bootstrap,
    attachDragDropListener,
  };
}
