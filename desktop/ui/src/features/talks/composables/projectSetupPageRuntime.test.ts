import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  createProjectSetupPageRuntime,
  type ProjectSetupPageRuntimeDeps,
} from "@/features/talks/composables/projectSetupPageRuntime";

vi.mock("@/stores/app", () => ({
  sessionStore: {},
  talksStore: {},
}));

function setup(overrides: Partial<ProjectSetupPageRuntimeDeps> = {}) {
  const state = {
    model: {
      activeProfileId: ref<string | null>("profile-1"),
      activeProject: ref<{ id: string; title: string } | null>({ id: "project-0", title: "Existing" }),
    },
    draft: {
      title: ref("New talk"),
      audience: ref("Beginners"),
      goal: ref("Deliver clearly"),
      duration: ref("10"),
    },
    ui: {
      error: ref<string | null>(null),
      errorCategory: ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null),
      isSaving: ref(false),
    },
  };

  const deps: ProjectSetupPageRuntimeDeps = {
    t: (key: string) => key,
    bootstrapSession: async () => {},
    createProject: vi.fn(async () => {}),
    pushHome: vi.fn(async () => {}),
    ...overrides,
  };

  return {
    state,
    deps,
    runtime: createProjectSetupPageRuntime({
      t: deps.t,
      pushHome: deps.pushHome,
      deps,
      state,
    }),
  };
}

describe("projectSetupPageRuntime", () => {
  it("validates empty title before create", async () => {
    const ctx = setup();
    ctx.state.draft.title.value = "   ";

    await ctx.runtime.saveProject();

    expect(ctx.state.ui.error.value).toBe("talk.title_required");
    expect(ctx.state.ui.errorCategory.value).toBe("validation");
    expect(ctx.deps.createProject).not.toHaveBeenCalled();
  });

  it("creates project and redirects home", async () => {
    const createProject = vi.fn(async () => {});
    const pushHome = vi.fn(async () => {});
    const ctx = setup({
      createProject,
      pushHome,
    });

    await ctx.runtime.saveProject();

    expect(createProject).toHaveBeenCalledWith({
      title: "New talk",
      audience: "Beginners",
      goal: "Deliver clearly",
      duration_target_sec: 600,
    });
    expect(pushHome).toHaveBeenCalledTimes(1);
  });

  it("maps bootstrap failures to ui.error", async () => {
    const ctx = setup({
      bootstrapSession: async () => {
        throw new Error("bootstrap-failed");
      },
    });

    await ctx.runtime.bootstrap();

    expect(ctx.state.ui.error.value).toBe("bootstrap-failed");
    expect(ctx.state.ui.errorCategory.value).toBe("unknown");
  });
});
