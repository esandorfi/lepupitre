import { reactive, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  createTalkDefineRuntime,
  type TalkDefineRuntimeDeps,
} from "./talkDefinePageRuntime";
import type { TalkProject } from "./talkDefinePageHelpers";

vi.mock("@/stores/app", () => ({
  sessionStore: {},
  talksStore: {},
}));

function createProject(overrides: Partial<TalkProject> = {}): TalkProject {
  return {
    id: "project-1",
    title: "Original title",
    audience: "Beginners",
    goal: "Learn",
    duration_target_sec: 600,
    stage: "draft",
    ...overrides,
  } as TalkProject;
}

function setup(
  options: {
    project?: TalkProject | null;
    form?: Partial<{ title: string; audience: string; goal: string; durationMinutes: string }>;
    nextAction?: { nextStage: "builder" | "train" | "export"; route: string; label: string } | null;
  } = {},
  depOverrides: Partial<TalkDefineRuntimeDeps> = {}
) {
  const state = {
    identity: {
      activeProfileId: ref<string | null>("profile-1"),
    },
    model: {
      project: ref<TalkProject | null>(options.project ?? createProject()),
      nextAction: ref(options.nextAction ?? null),
    },
    draft: {
      form: reactive({
        title: options.form?.title ?? "Original title",
        audience: options.form?.audience ?? "Beginners",
        goal: options.form?.goal ?? "Learn",
        durationMinutes: options.form?.durationMinutes ?? "10",
      }),
    },
    ui: {
      saveError: ref<string | null>(null),
      saveState: ref<"idle" | "saving" | "saved" | "error">("idle"),
      error: ref<string | null>(null),
      isLoading: ref(false),
    },
  };

  const deps: TalkDefineRuntimeDeps = {
    t: (key: string) => key,
    bootstrapSession: async () => {},
    loadProjects: async () => {},
    updateProject: vi.fn(async () => {}),
    pushRoute: vi.fn(async () => {}),
    ...depOverrides,
  };

  const runtime = createTalkDefineRuntime({
    t: deps.t,
    pushRoute: deps.pushRoute,
    state,
    deps,
  });

  return { state, deps, runtime };
}

describe("talkDefinePageRuntime", () => {
  it("marks save as saved without update when payload matches project", async () => {
    const ctx = setup();

    await ctx.runtime.saveDefine();

    expect(ctx.state.ui.saveState.value).toBe("saved");
    expect(ctx.deps.updateProject).not.toHaveBeenCalled();
  });

  it("updates project when define payload changed", async () => {
    const updateProject = vi.fn(async () => {});
    const ctx = setup(
      {
        form: { title: "New title" },
      },
      { updateProject }
    );

    await ctx.runtime.saveDefine();

    expect(ctx.state.ui.saveState.value).toBe("saved");
    expect(updateProject).toHaveBeenCalledTimes(1);
    expect(updateProject).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({ title: "New title" })
    );
  });

  it("maps validation errors into save error state", async () => {
    const ctx = setup({
      form: { title: "   " },
    });

    await ctx.runtime.saveDefine();

    expect(ctx.state.ui.saveState.value).toBe("error");
    expect(ctx.state.ui.saveError.value).toBe("talk.title_required");
  });

  it("runs next action by persisting stage then routing", async () => {
    const updateProject = vi.fn(async () => {});
    const pushRoute = vi.fn(async () => {});
    const ctx = setup(
      {
        form: { title: "Retitled" },
        nextAction: {
          nextStage: "builder",
          route: "/talks/project-1/builder",
          label: "Continue",
        },
      },
      {
        updateProject,
        pushRoute,
      }
    );

    await ctx.runtime.runNextAction();

    expect(updateProject).toHaveBeenCalledTimes(1);
    expect(pushRoute).toHaveBeenCalledWith("/talks/project-1/builder");
  });

  it("maps bootstrap failures to ui.error and resets loading", async () => {
    const ctx = setup({}, {
      bootstrapSession: async () => {
        throw new Error("bootstrap-failed");
      },
    });

    await ctx.runtime.bootstrap();

    expect(ctx.state.ui.error.value).toBe("bootstrap-failed");
    expect(ctx.state.ui.isLoading.value).toBe(false);
  });
});
