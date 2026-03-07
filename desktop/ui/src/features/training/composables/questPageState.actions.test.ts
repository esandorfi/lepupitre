import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { Quest } from "@/schemas/ipc";
import { createQuestActions, type QuestActionsDeps } from "./questPageState.actions";

function createQuest(code: string, outputType: "audio" | "text" = "text"): Quest {
  return {
    code,
    title: `Quest ${code}`,
    prompt: "Prompt",
    category: "General",
    output_type: outputType,
    estimated_sec: 90,
  } as unknown as Quest;
}

function setup(overrides: Partial<QuestActionsDeps> = {}) {
  const state = {
    identity: {
      questCode: ref("Q1"),
      contextProjectId: ref("project-1"),
      backLink: ref("/training"),
      isAudioQuest: ref(false),
    },
    model: {
      quest: ref<Quest | null>(createQuest("Q1")),
      attemptId: ref<string | null>(null),
      audioArtifactId: ref<string | null>(null),
      transcriptId: ref<string | null>(null),
      text: ref("My answer"),
      submittedTextSnapshot: ref<string | null>(null),
    },
    ui: {
      error: ref<string | null>(null),
      isSubmitting: ref(false),
      isAnalyzing: ref(false),
      isLoading: ref(false),
    },
  };

  const deps: QuestActionsDeps = {
    t: (key: string) => key,
    bootstrapSession: async () => {},
    getActiveProfileId: () => "profile-1",
    getDailyQuestCode: () => null,
    getDailyQuestQuest: () => null,
    getQuestByCode: async (code) => createQuest(code),
    submitQuestTextForProject: async () => "attempt-1",
    submitQuestAudioForProject: async () => "attempt-audio-1",
    analyzeAttempt: async () => "feedback-1",
    routerPush: async () => {},
    ...overrides,
  };

  return {
    state,
    deps,
    actions: createQuestActions({
      t: deps.t,
      routerPush: deps.routerPush,
      state,
      deps,
    }),
  };
}

describe("questPageState.actions", () => {
  it("fails loadQuest when quest code is empty", async () => {
    const ctx = setup();
    ctx.state.identity.questCode.value = "  ";

    await ctx.actions.loadQuest();

    expect(ctx.state.ui.error.value).toBe("quest.empty");
  });

  it("loads from daily quest when code matches", async () => {
    const getQuestByCode = vi.fn(async (code: string) => createQuest(code));
    const dailyQuest = createQuest("Q1");
    const ctx = setup({
      getDailyQuestCode: () => "Q1",
      getDailyQuestQuest: () => dailyQuest,
      getQuestByCode,
    });

    await ctx.actions.loadQuest();

    expect(ctx.state.model.quest.value?.code).toBe("Q1");
    expect(getQuestByCode).not.toHaveBeenCalled();
  });

  it("submits text and stores attempt snapshot", async () => {
    const submitQuestTextForProject = vi.fn(async () => "attempt-42");
    const ctx = setup({
      submitQuestTextForProject,
    });

    await ctx.actions.submit();

    expect(submitQuestTextForProject).toHaveBeenCalledWith("project-1", "Q1", "My answer");
    expect(ctx.state.model.attemptId.value).toBe("attempt-42");
    expect(ctx.state.model.submittedTextSnapshot.value).toBe("My answer");
  });

  it("requires transcription before analyzing audio quest", async () => {
    const analyzeAttempt = vi.fn(async () => "feedback-1");
    const ctx = setup({
      analyzeAttempt,
    });
    ctx.state.identity.isAudioQuest.value = true;
    ctx.state.model.attemptId.value = "attempt-a1";
    ctx.state.model.transcriptId.value = null;

    await ctx.actions.requestFeedback();

    expect(ctx.state.ui.error.value).toBe("quest.transcribe_first");
    expect(analyzeAttempt).not.toHaveBeenCalled();
  });

  it("analyzes attempt and routes to feedback focus", async () => {
    const routerPush = vi.fn(async () => {});
    const analyzeAttempt = vi.fn(async () => "feedback-99");
    const ctx = setup({
      analyzeAttempt,
      routerPush,
    });
    ctx.state.model.attemptId.value = "attempt-99";

    await ctx.actions.requestFeedback();

    expect(analyzeAttempt).toHaveBeenCalledWith("attempt-99");
    expect(routerPush).toHaveBeenCalledWith("/feedback?focus=feedback-99&source=quest");
  });
});
