import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { DragDropEvent } from "@tauri-apps/api/window";
import type { PackInspectResponse } from "@/schemas/ipc";
import { createPacksPageRuntime, type PacksPageRuntimeDeps } from "./packsPageRuntime";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(),
}));

vi.mock("@/stores/app", () => ({
  packStore: {},
  sessionStore: {},
}));

vi.mock("@/lib/runtime", () => ({
  hasTauriRuntime: () => false,
}));

function createInspectResult(): PackInspectResponse {
  return {
    schemaVersion: "1.0.0",
    peerReviewId: "peer-1",
    projectId: "project-1",
    runId: "run-1",
    questCode: "Q1",
    reviewer: "Coach",
    generatedAt: "2026-03-01T10:00:00Z",
    sizeBytes: 1024,
  } as unknown as PackInspectResponse;
}

function setup(overrides: Partial<PacksPageRuntimeDeps> = {}) {
  const state = {
    identity: {
      t: (key: string) => key,
    },
    model: {
      importPath: ref(""),
      importResult: ref<{ projectId: string; runId: string; peerReviewId: string } | null>(null),
      importDetails: ref<PackInspectResponse | null>(null),
    },
    ui: {
      error: ref<string | null>(null),
      importStatus: ref<"idle" | "importing" | "success" | "error">("idle"),
      isInspecting: ref(false),
      isPicking: ref(false),
      isDragging: ref(false),
    },
  };

  const deps: PacksPageRuntimeDeps = {
    openPackDialog: async () => null,
    inspectPack: async () => createInspectResult(),
    importPeerReview: async () => ({
      projectId: "project-1",
      runId: "run-1",
      peerReviewId: "peer-1",
    }),
    bootstrapSession: async () => {},
    listenDragDrop: async () => null,
    ...overrides,
  };

  return {
    state,
    deps,
    runtime: createPacksPageRuntime({ state, deps }),
  };
}

describe("packsPageRuntime", () => {
  it("validates missing import path before import", async () => {
    const ctx = setup();

    await ctx.runtime.importReview();

    expect(ctx.state.ui.error.value).toBe("packs.import_no_path");
    expect(ctx.state.ui.importStatus.value).toBe("idle");
  });

  it("imports review successfully when path and details are present", async () => {
    const ctx = setup();
    ctx.state.model.importPath.value = "C:/tmp/review.zip";
    ctx.state.model.importDetails.value = createInspectResult();

    await ctx.runtime.importReview();

    expect(ctx.state.ui.importStatus.value).toBe("success");
    expect(ctx.state.model.importResult.value).toEqual({
      projectId: "project-1",
      runId: "run-1",
      peerReviewId: "peer-1",
    });
  });

  it("picks a pack path and inspects it", async () => {
    const inspectPack = vi.fn(async () => createInspectResult());
    const ctx = setup({
      openPackDialog: async () => "C:/tmp/review.zip",
      inspectPack,
    });

    await ctx.runtime.pickPack();

    expect(ctx.state.model.importPath.value).toBe("C:/tmp/review.zip");
    expect(inspectPack).toHaveBeenCalledWith("C:/tmp/review.zip");
    expect(ctx.state.ui.isPicking.value).toBe(false);
  });

  it("handles dropped zip files from drag-drop listener", async () => {
    let capturedHandler: (payload: DragDropEvent) => void = () => {};
    const inspectPack = vi.fn(async () => createInspectResult());
    const ctx = setup({
      inspectPack,
      listenDragDrop: async (handler) => {
        capturedHandler = handler;
        return () => {};
      },
    });

    await ctx.runtime.attachDragDropListener();
    capturedHandler({
      type: "drop",
      paths: ["C:/tmp/review.zip"],
      position: { x: 0, y: 0 },
    } as DragDropEvent);

    expect(ctx.state.model.importPath.value).toBe("C:/tmp/review.zip");
    expect(inspectPack).toHaveBeenCalledWith("C:/tmp/review.zip");
  });

  it("maps bootstrap failures to ui.error", async () => {
    const ctx = setup({
      bootstrapSession: async () => {
        throw new Error("bootstrap-failed");
      },
    });

    await ctx.runtime.bootstrap();

    expect(ctx.state.ui.error.value).toBe("bootstrap-failed");
  });
});
