import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { FeedbackContext, FeedbackV1, MascotMessage } from "@/schemas/ipc";
import { createFeedbackPageRuntime, type FeedbackPageRuntimeDeps } from "./feedbackPageRuntime";

vi.mock("@/stores/app", () => ({
  appState: { activeProfileId: null },
  coachStore: {},
  feedbackStore: {},
  sessionStore: {},
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

function createFeedback(overallScore: number): FeedbackV1 {
  return {
    schema_version: "1.0.0",
    overall_score: overallScore,
    top_actions: [],
    comments: [],
    metrics: {
      wpm: 120,
      filler_per_min: 2,
      pause_count: 3,
      avg_sentence_words: 11,
      repeat_terms: [],
      jargon_terms: [],
      density_score: 70,
    },
  };
}

function setup(overrides: Partial<FeedbackPageRuntimeDeps> = {}) {
  const state = {
    identity: {
      feedbackId: ref("fb-1"),
      locale: ref("en"),
    },
    model: {
      feedback: ref<FeedbackV1 | null>(null),
      context: ref<FeedbackContext | null>(null),
      mascotMessage: ref<MascotMessage | null>(null),
      reviewMarked: ref(false),
    },
    draft: {
      note: ref(""),
      lastSavedNote: ref(""),
    },
    ui: {
      showMascotCard: ref(true),
      error: ref<string | null>(null),
      isLoading: ref(false),
      noteStatus: ref<"idle" | "saving" | "saved" | "error">("idle"),
    },
  };

  const deps: FeedbackPageRuntimeDeps = {
    getActiveProfileId: () => "profile-1",
    bootstrapSession: async () => {},
    getFeedback: async () =>
      createFeedback(82),
    getFeedbackContext: async () =>
      ({
        project_id: "project-1",
      }) as FeedbackContext,
    getFeedbackNote: async () => "saved note",
    setFeedbackNote: async () => {},
    getMascotContextMessage: async () =>
      ({
        id: "m1",
        kind: "nudge",
        title: "Focus",
        body: "Keep training",
        cta_label: null,
        cta_route: null,
      }) as MascotMessage,
    isFeedbackReviewed: () => false,
    markFeedbackReviewed: vi.fn(),
    scheduleTimeout: (fn) => {
      fn();
    },
    ...overrides,
  };

  const runtime = createFeedbackPageRuntime({ state, deps });
  return { state, deps, runtime };
}

describe("feedbackPageRuntime", () => {
  it("loads feedback data and note with grouped state contract", async () => {
    const ctx = setup();

    await ctx.runtime.loadPage();

    expect(ctx.state.ui.isLoading.value).toBe(false);
    expect(ctx.state.ui.error.value).toBeNull();
    expect(ctx.state.model.feedback.value?.overall_score).toBe(82);
    expect(ctx.state.model.context.value?.project_id).toBe("project-1");
    expect(ctx.state.draft.note.value).toBe("saved note");
    expect(ctx.state.draft.lastSavedNote.value).toBe("saved note");
    expect(ctx.state.model.reviewMarked.value).toBe(true);
    expect(ctx.deps.markFeedbackReviewed).toHaveBeenCalledWith("profile-1", "fb-1");
  });

  it("maps load errors to ui.error and clears loading", async () => {
    const ctx = setup({
      getFeedback: async () => {
        throw new Error("feedback-load-failed");
      },
    });

    await ctx.runtime.loadPage();

    expect(ctx.state.ui.error.value).toBe("feedback-load-failed");
    expect(ctx.state.ui.isLoading.value).toBe(false);
  });

  it("uses takeLatest behavior for concurrent load requests", async () => {
    const firstBootstrap = createDeferred<void>();
    let bootstrapCalls = 0;
    let callCount = 0;

    const ctx = setup({
      bootstrapSession: async () => {
        bootstrapCalls += 1;
        if (bootstrapCalls === 1) {
          await firstBootstrap.promise;
        }
      },
      getFeedback: async () => {
        callCount += 1;
        if (callCount === 1) {
          return createFeedback(99);
        }
        await delay(25);
        return createFeedback(10);
      },
      getFeedbackContext: async () => {
        await delay(10);
        return {
          subject_type: "quest_attempt",
          subject_id: "attempt-1",
          project_id: "project-1",
          quest_code: null,
          quest_title: null,
          run_id: null,
        };
      },
    });

    const firstLoad = ctx.runtime.loadPage();
    const secondLoad = ctx.runtime.loadPage();
    firstBootstrap.resolve();
    await Promise.all([firstLoad, secondLoad]);

    expect(ctx.state.model.feedback.value?.overall_score).toBe(99);
  });

  it("saves note with guarded status transition", async () => {
    vi.useFakeTimers();
    try {
      const ctx = setup({
        scheduleTimeout: (fn, delayMs) => {
          setTimeout(fn, delayMs);
        },
      });
      ctx.state.draft.note.value = "new note";
      ctx.state.draft.lastSavedNote.value = "old note";

      await ctx.runtime.saveNote();
      expect(ctx.state.ui.noteStatus.value).toBe("saved");
      expect(ctx.state.draft.lastSavedNote.value).toBe("new note");

      vi.advanceTimersByTime(1200);
      expect(ctx.state.ui.noteStatus.value).toBe("idle");
    } finally {
      vi.useRealTimers();
    }
  });
});
