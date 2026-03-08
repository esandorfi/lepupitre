import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { RunSummary } from "@/schemas/ipc";
import { createBossRunActions, type BossRunActionsDeps } from "./bossRunPageState.actions";

function createRun(id: string, feedbackId: string | null = null): RunSummary {
  return {
    id,
    subject: "boss_run",
    created_at: "2026-03-01T10:00:00Z",
    score: null,
    feedback_id: feedbackId,
    transcript_id: null,
    audio_artifact_id: "artifact-1",
  } as unknown as RunSummary;
}

function setup(overrides: Partial<BossRunActionsDeps> = {}) {
  const state = {
    identity: {
      activeProjectId: ref<string | undefined>("project-1"),
      requestedRunId: ref(""),
    },
    model: {
      run: ref<RunSummary | null>(null),
      pendingTranscriptId: ref<string | null>(null),
    },
    ui: {
      error: ref<string | null>(null),
      errorCategory: ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null),
      isLoading: ref(false),
      isSaving: ref(false),
      isAnalyzing: ref(false),
    },
  };

  const deps: BossRunActionsDeps = {
    t: (key: string) => key,
    bootstrapSession: async () => {},
    getRun: async (runId) => createRun(runId),
    getLatestRun: async () => createRun("latest-run"),
    createRun: async () => "new-run",
    finishRun: async () => {},
    setRunTranscript: async () => {},
    analyzeRun: async () => "feedback-1",
    routerPush: async () => {},
    ...overrides,
  };

  return {
    state,
    deps,
    actions: createBossRunActions({
      t: deps.t,
      routerPush: deps.routerPush,
      state,
      deps,
    }),
  };
}

describe("bossRunPageState.actions", () => {
  it("loads latest run and falls back when requested run is missing", async () => {
    const getRun = vi.fn(async () => null);
    const getLatestRun = vi.fn(async () => createRun("latest-fallback"));
    const ctx = setup({
      getRun,
      getLatestRun,
    });
    ctx.state.identity.requestedRunId.value = "requested-1";

    await ctx.actions.loadLatest();

    expect(getRun).toHaveBeenCalledWith("requested-1");
    expect(getLatestRun).toHaveBeenCalledWith("project-1");
    expect(ctx.state.model.run.value?.id).toBe("latest-fallback");
  });

  it("blocks audio save when no active talk is selected", async () => {
    const ctx = setup();
    ctx.state.identity.activeProjectId.value = undefined;

    await ctx.actions.handleAudioSaved({ artifactId: "artifact-x" });

    expect(ctx.state.ui.error.value).toBe("boss_run.need_talk");
    expect(ctx.state.ui.errorCategory.value).toBe("validation");
  });

  it("stores pending transcript when run is not yet created", async () => {
    const ctx = setup();
    ctx.state.model.run.value = null;

    await ctx.actions.handleTranscribed({ transcriptId: "tr-1" });

    expect(ctx.state.model.pendingTranscriptId.value).toBe("tr-1");
  });

  it("requests feedback and routes to focused feedback page", async () => {
    const analyzeRun = vi.fn(async () => "feedback-99");
    const routerPush = vi.fn(async () => {});
    const ctx = setup({
      analyzeRun,
      routerPush,
    });
    ctx.state.model.run.value = createRun("run-99");

    await ctx.actions.requestFeedback();

    expect(analyzeRun).toHaveBeenCalledWith("run-99");
    expect(routerPush).toHaveBeenCalledWith("/feedback?focus=feedback-99&source=boss-run");
  });

  it("opens direct feedback route from existing run feedback id", async () => {
    const routerPush = vi.fn(async () => {});
    const ctx = setup({
      routerPush,
    });
    ctx.state.model.run.value = createRun("run-1", "feedback-direct");

    ctx.actions.handleViewFeedback();

    expect(routerPush).toHaveBeenCalledWith("/feedback/feedback-direct");
  });
});
