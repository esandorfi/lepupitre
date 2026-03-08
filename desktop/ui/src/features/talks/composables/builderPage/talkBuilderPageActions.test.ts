import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { TalksBlueprint } from "@/schemas/ipc";
import { createBuilderActions, type BuilderActionsDeps } from "./talkBuilderPageActions";

function createBlueprint(frameworkId = "hook-story-proof"): TalksBlueprint {
  return {
    framework_id: frameworkId,
  } as unknown as TalksBlueprint;
}

function setup(overrides: Partial<BuilderActionsDeps> = {}) {
  const state = {
    identity: {
      selectedProjectId: ref("project-1"),
      activeProfileId: ref<string | null | undefined>("profile-1"),
    },
    model: {
      outline: ref("Initial outline"),
      exportPath: ref<string | null>(null),
      blueprint: ref<TalksBlueprint | null>(createBlueprint()),
    },
    ui: {
      error: ref<string | null>(null),
      errorCategory: ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null),
      isLoading: ref(false),
      isSaving: ref(false),
      saveStatus: ref<"idle" | "saving" | "saved" | "error">("idle"),
      isExporting: ref(false),
      isRevealing: ref(false),
      isApplyingTemplate: ref(false),
    },
  };

  const deps: BuilderActionsDeps = {
    t: (key: string) => key,
    bootstrapSession: async () => {},
    loadProjects: async () => {},
    getOutline: async () => ({ markdown: "# Outline" }),
    getTalksBlueprint: async () => createBlueprint(),
    saveOutline: async () => {},
    ensureProjectStageAtLeast: async () => {},
    exportOutline: async () => ({ path: "C:/tmp/outline.md" }),
    revealPath: async () => {},
    confirm: () => true,
    scheduleTimeout: (fn) => fn(),
    ...overrides,
  };

  return {
    state,
    deps,
    actions: createBuilderActions({
      t: deps.t,
      state,
      deps,
    }),
  };
}

describe("talkBuilderPageActions", () => {
  it("loads outline and blueprint for selected project", async () => {
    const ctx = setup();

    await ctx.actions.loadOutline();

    expect(ctx.state.model.outline.value).toBe("# Outline");
    expect(ctx.state.model.blueprint.value?.framework_id).toBe("hook-story-proof");
    expect(ctx.state.ui.isLoading.value).toBe(false);
  });

  it("blocks save when project is missing", async () => {
    const ctx = setup();
    ctx.state.identity.selectedProjectId.value = "";

    await ctx.actions.saveOutline();

    expect(ctx.state.ui.error.value).toBe("builder.no_talk");
    expect(ctx.state.ui.errorCategory.value).toBe("validation");
  });

  it("saves outline and resets save status", async () => {
    vi.useFakeTimers();
    try {
      const saveOutline = vi.fn(async () => {});
      const ctx = setup({
        saveOutline,
        scheduleTimeout: (fn, delayMs) => setTimeout(fn, delayMs),
      });

      await ctx.actions.saveOutline();
      expect(saveOutline).toHaveBeenCalledWith("project-1", "Initial outline");
      expect(ctx.state.ui.saveStatus.value).toBe("saved");

      vi.advanceTimersByTime(1200);
      expect(ctx.state.ui.saveStatus.value).toBe("idle");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not overwrite outline when template confirmation is rejected", async () => {
    const saveOutline = vi.fn(async () => {});
    const ctx = setup({
      confirm: () => false,
      saveOutline,
    });

    await ctx.actions.applyFrameworkTemplate();

    expect(ctx.state.model.outline.value).toBe("Initial outline");
    expect(saveOutline).not.toHaveBeenCalled();
  });

  it("exports and reveals outline", async () => {
    const revealPath = vi.fn(async () => {});
    const ctx = setup({
      revealPath,
    });

    await ctx.actions.exportOutline();
    await ctx.actions.revealExport();

    expect(ctx.state.model.exportPath.value).toBe("C:/tmp/outline.md");
    expect(revealPath).toHaveBeenCalledWith("C:/tmp/outline.md");
    expect(ctx.state.ui.isExporting.value).toBe(false);
    expect(ctx.state.ui.isRevealing.value).toBe(false);
  });
});
