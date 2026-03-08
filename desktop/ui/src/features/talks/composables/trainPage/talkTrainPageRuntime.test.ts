import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "@/schemas/ipc";
import { createTalkTrainRuntime, type TalkTrainRuntimeDeps } from "./talkTrainPageRuntime";

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

function setup(overrides: Partial<TalkTrainRuntimeDeps> = {}) {
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
    },
  };

  const deps: TalkTrainRuntimeDeps = {
    bootstrapSession: async () => {},
    loadProjects: async () => {},
    getQuestReport: async () => [{ quest_code: "Q1" } as QuestReportItem],
    getQuestAttempts: async () => [{ id: "attempt-1" } as QuestAttemptSummary],
    getRuns: async () => [{ id: "run-1" } as RunSummary],
    getPeerReviews: async () => [{ id: "peer-1" } as PeerReviewSummary],
    setActiveProject: async () => {},
    ensureProjectStageAtLeast: async () => {},
    ...overrides,
  };

  return {
    state,
    deps,
    runtime: createTalkTrainRuntime({ state, deps }),
  };
}

describe("talkTrainPageRuntime", () => {
  it("sets validation error when project id is missing", async () => {
    const ctx = setup();
    ctx.state.identity.projectId.value = "";

    await ctx.runtime.loadData();

    expect(ctx.state.ui.error.value).toBe("project_missing");
    expect(ctx.state.ui.errorCategory.value).toBe("validation");
    expect(ctx.state.ui.isLoading.value).toBe(false);
  });

  it("loads talk train datasets", async () => {
    const ctx = setup();

    await ctx.runtime.loadData();

    expect(ctx.state.ui.error.value).toBeNull();
    expect(ctx.state.ui.isLoading.value).toBe(false);
    expect(ctx.state.model.report.value).toHaveLength(1);
    expect(ctx.state.model.attempts.value).toHaveLength(1);
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
        await delay(25);
        return [{ quest_code: "STALE" } as QuestReportItem];
      },
      getQuestAttempts: async () => [{ id: "attempt" } as QuestAttemptSummary],
      getRuns: async () => [{ id: "run" } as RunSummary],
      getPeerReviews: async () => [{ id: "peer" } as PeerReviewSummary],
    });

    const firstLoad = ctx.runtime.loadData();
    const secondLoad = ctx.runtime.loadData();
    firstBootstrap.resolve();
    await Promise.all([firstLoad, secondLoad]);

    expect(ctx.state.model.report.value[0]?.quest_code).toBe("LATEST");
  });

  it("maps setActive errors and resets activating flag", async () => {
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

  it("keeps markTrainStage non-blocking on ensure errors", async () => {
    const ctx = setup({
      ensureProjectStageAtLeast: vi.fn(async () => {
        throw new Error("ignored");
      }),
    });

    await expect(ctx.runtime.markTrainStage()).resolves.toBeUndefined();
    expect(ctx.deps.ensureProjectStageAtLeast).toHaveBeenCalledWith("project-1", "train");
  });
});
