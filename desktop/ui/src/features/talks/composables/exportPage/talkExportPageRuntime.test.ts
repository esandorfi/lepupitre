import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { PeerReviewSummary, QuestReportItem, RunSummary } from "@/schemas/ipc";
import { createTalkExportRuntime, type TalkExportRuntimeDeps } from "./talkExportPageRuntime";

vi.mock("@/stores/app", () => ({
  packStore: {},
  runStore: {},
  sessionStore: {},
  talksStore: {},
  trainingStore: {},
}));

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setup(overrides: Partial<TalkExportRuntimeDeps> = {}) {
  const state = {
    identity: {
      projectId: ref("project-1"),
    },
    model: {
      report: ref<QuestReportItem[]>([]),
      runs: ref<RunSummary[]>([]),
      peerReviews: ref<PeerReviewSummary[]>([]),
    },
    ui: {
      error: ref<string | null>(null),
      errorCategory: ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null),
      isLoading: ref(false),
      isActivating: ref(false),
      exportPath: ref<string | null>(null),
      exportingRunId: ref<string | null>(null),
      isExportingOutline: ref(false),
      isRevealing: ref(false),
      exportError: ref<string | null>(null),
      exportErrorCategory: ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null),
    },
  };

  const deps: TalkExportRuntimeDeps = {
    revealPath: async () => {},
    exportPack: async () => ({ path: "C:/tmp/pack.zip" }),
    exportOutline: async () => ({ path: "C:/tmp/outline.md" }),
    bootstrapSession: async () => {},
    loadProjects: async () => {},
    getQuestReport: async () => [{ quest_code: "Q1" } as QuestReportItem],
    getRuns: async () => [{ id: "run-1" } as RunSummary],
    getPeerReviews: async () => [{ id: "peer-1" } as PeerReviewSummary],
    setActiveProject: async () => {},
    ensureProjectStageAtLeast: async () => {},
    ...overrides,
  };

  return {
    state,
    deps,
    runtime: createTalkExportRuntime({ state, deps }),
  };
}

describe("talkExportPageRuntime", () => {
  it("sets validation error when project id is missing", async () => {
    const ctx = setup();
    ctx.state.identity.projectId.value = "";

    await ctx.runtime.loadData();

    expect(ctx.state.ui.error.value).toBe("project_missing");
    expect(ctx.state.ui.errorCategory.value).toBe("validation");
    expect(ctx.state.ui.isLoading.value).toBe(false);
  });

  it("loads export page datasets", async () => {
    const ctx = setup();

    await ctx.runtime.loadData();

    expect(ctx.state.ui.error.value).toBeNull();
    expect(ctx.state.ui.isLoading.value).toBe(false);
    expect(ctx.state.model.report.value).toHaveLength(1);
    expect(ctx.state.model.runs.value).toHaveLength(1);
    expect(ctx.state.model.peerReviews.value).toHaveLength(1);
  });

  it("uses takeLatest behavior for concurrent loadData calls", async () => {
    const firstBootstrap = createDeferred<void>();
    let bootstrapCalls = 0;
    let reportCalls = 0;

    const ctx = setup({
      bootstrapSession: async () => {
        bootstrapCalls += 1;
        if (bootstrapCalls === 1) {
          await firstBootstrap.promise;
        }
      },
      getQuestReport: async () => {
        reportCalls += 1;
        if (reportCalls === 1) {
          return [{ quest_code: "LATEST" } as QuestReportItem];
        }
        await delay(20);
        return [{ quest_code: "STALE" } as QuestReportItem];
      },
    });

    const firstLoad = ctx.runtime.loadData();
    const secondLoad = ctx.runtime.loadData();
    firstBootstrap.resolve();
    await Promise.all([firstLoad, secondLoad]);

    expect(ctx.state.model.report.value[0]?.quest_code).toBe("LATEST");
  });

  it("exports an outline and stores the exported path", async () => {
    const ctx = setup();

    await ctx.runtime.exportOutline();

    expect(ctx.state.ui.exportPath.value).toBe("C:/tmp/outline.md");
    expect(ctx.state.ui.isExportingOutline.value).toBe(false);
    expect(ctx.state.ui.exportError.value).toBeNull();
  });

  it("maps exportPack failures to exportError", async () => {
    const ctx = setup({
      exportPack: async () => {
        throw new Error("pack-export-failed");
      },
    });

    await ctx.runtime.exportPack("run-5");

    expect(ctx.state.ui.exportError.value).toBe("pack-export-failed");
    expect(ctx.state.ui.exportErrorCategory.value).toBe("unknown");
    expect(ctx.state.ui.exportingRunId.value).toBeNull();
  });

  it("keeps markExportStage non-blocking on ensure failures", async () => {
    const ctx = setup({
      ensureProjectStageAtLeast: vi.fn(async () => {
        throw new Error("ignored");
      }),
    });

    await expect(ctx.runtime.markExportStage()).resolves.toBeUndefined();
    expect(ctx.deps.ensureProjectStageAtLeast).toHaveBeenCalledWith("project-1", "export");
  });
});
