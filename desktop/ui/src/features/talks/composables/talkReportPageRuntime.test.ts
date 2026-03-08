import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "@/schemas/ipc";
import { createTalkReportRuntime, type TalkReportRuntimeDeps } from "./talkReportPageRuntime";

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

function setup(overrides: Partial<TalkReportRuntimeDeps> = {}) {
  const state = {
    identity: {
      projectId: ref("project-1"),
    },
    model: {
      report: ref<QuestReportItem[]>([]),
      attempts: ref<QuestAttemptSummary[]>([]),
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
      isRevealing: ref(false),
      exportError: ref<string | null>(null),
      exportErrorCategory: ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null),
    },
  };

  const deps: TalkReportRuntimeDeps = {
    revealPath: async () => {},
    exportPack: async () => ({ path: "C:/tmp/pack.zip" }),
    bootstrapSession: async () => {},
    loadProjects: async () => {},
    getQuestReport: async () => [{ quest_code: "Q1" } as QuestReportItem],
    getQuestAttempts: async () => [{ id: "attempt-1" } as QuestAttemptSummary],
    getRuns: async () => [{ id: "run-1" } as RunSummary],
    getPeerReviews: async () => [{ id: "peer-1" } as PeerReviewSummary],
    setActiveProject: async () => {},
    ...overrides,
  };

  return {
    state,
    deps,
    runtime: createTalkReportRuntime({ state, deps }),
  };
}

describe("talkReportPageRuntime", () => {
  it("loads report and timeline data", async () => {
    const ctx = setup();

    await ctx.runtime.loadReport();

    expect(ctx.state.ui.error.value).toBeNull();
    expect(ctx.state.ui.isLoading.value).toBe(false);
    expect(ctx.state.model.report.value).toHaveLength(1);
    expect(ctx.state.model.attempts.value).toHaveLength(1);
    expect(ctx.state.model.runs.value).toHaveLength(1);
    expect(ctx.state.model.peerReviews.value).toHaveLength(1);
  });

  it("uses takeLatest behavior for concurrent loadReport calls", async () => {
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
      getQuestAttempts: async () => [{ id: "attempt" } as QuestAttemptSummary],
      getRuns: async () => [{ id: "run" } as RunSummary],
      getPeerReviews: async () => [{ id: "peer" } as PeerReviewSummary],
    });

    const firstLoad = ctx.runtime.loadReport();
    const secondLoad = ctx.runtime.loadReport();
    firstBootstrap.resolve();
    await Promise.all([firstLoad, secondLoad]);

    expect(ctx.state.model.report.value[0]?.quest_code).toBe("LATEST");
  });

  it("exports a run pack and stores exported path", async () => {
    const ctx = setup();

    await ctx.runtime.exportPack("run-9");

    expect(ctx.state.ui.exportPath.value).toBe("C:/tmp/pack.zip");
    expect(ctx.state.ui.exportingRunId.value).toBeNull();
    expect(ctx.state.ui.exportError.value).toBeNull();
  });

  it("maps revealExport failures to exportError", async () => {
    const ctx = setup({
      revealPath: async () => {
        throw new Error("reveal-failed");
      },
    });
    ctx.state.ui.exportPath.value = "C:/tmp/pack.zip";

    await ctx.runtime.revealExport();

    expect(ctx.state.ui.exportError.value).toBe("reveal-failed");
    expect(ctx.state.ui.exportErrorCategory.value).toBe("unknown");
    expect(ctx.state.ui.isRevealing.value).toBe(false);
  });

  it("maps setActive failures to ui.error", async () => {
    const ctx = setup({
      setActiveProject: async () => {
        throw new Error("set-active-failed");
      },
    });

    await ctx.runtime.setActive();

    expect(ctx.state.ui.error.value).toBe("set-active-failed");
    expect(ctx.state.ui.errorCategory.value).toBe("unknown");
    expect(ctx.state.ui.isActivating.value).toBe(false);
  });
});
