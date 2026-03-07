import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { MascotMessage, TalksBlueprint } from "@/schemas/ipc";
import { createTalksRuntime, type TalksRuntimeDeps } from "./talksPageRuntime";

vi.mock("@/stores/app", () => ({
  coachStore: {},
  sessionStore: {},
  talksStore: {},
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

function setup(overrides: Partial<TalksRuntimeDeps> = {}) {
  const state = {
    identity: {
      locale: ref("en"),
      showMascotCard: ref(true),
    },
    model: {
      appState: ref({
        activeProfileId: "profile-1",
        activeProject: { id: "project-1" },
      }),
      mascotMessage: ref<MascotMessage | null>(null),
      talksBlueprint: ref<TalksBlueprint | null>(null),
    },
    ui: {
      error: ref<string | null>(null),
      isLoading: ref(false),
      isBlueprintLoading: ref(false),
      isSwitching: ref<string | null>(null),
    },
  };

  const deps: TalksRuntimeDeps = {
    getTalksBlueprint: async () => ({ completion_percent: 72 } as TalksBlueprint),
    getMascotContextMessage: async () =>
      ({
        id: "m1",
        kind: "nudge",
        title: "Nice progress",
        body: "Keep going",
        cta_label: null,
        cta_route: null,
      }) as MascotMessage,
    bootstrapSession: async () => {},
    loadProjects: async () => {},
    setActiveProject: async () => {},
    ...overrides,
  };

  return {
    state,
    deps,
    runtime: createTalksRuntime({ state, deps }),
  };
}

describe("talksPageRuntime", () => {
  it("bootstraps talks page data", async () => {
    const ctx = setup();

    await ctx.runtime.bootstrap();

    expect(ctx.state.ui.error.value).toBeNull();
    expect(ctx.state.ui.isLoading.value).toBe(false);
    expect(ctx.state.model.talksBlueprint.value?.completion_percent).toBe(72);
    expect(ctx.state.model.mascotMessage.value?.title).toBe("Nice progress");
  });

  it("uses takeLatest behavior for concurrent blueprint refresh", async () => {
    const firstResponse = createDeferred<TalksBlueprint>();
    let calls = 0;
    const ctx = setup({
      getTalksBlueprint: async () => {
        calls += 1;
        if (calls === 1) {
          return firstResponse.promise;
        }
        await delay(10);
        return { completion_percent: 90 } as TalksBlueprint;
      },
    });

    const firstRefresh = ctx.runtime.refreshTalksBlueprint();
    const secondRefresh = ctx.runtime.refreshTalksBlueprint();
    firstResponse.resolve({ completion_percent: 30 } as TalksBlueprint);
    await Promise.all([firstRefresh, secondRefresh]);

    expect(ctx.state.model.talksBlueprint.value?.completion_percent).toBe(90);
  });

  it("maps setActive failures and resets switching state", async () => {
    const ctx = setup({
      setActiveProject: async () => {
        throw new Error("set-active-failed");
      },
    });

    await ctx.runtime.setActive("project-2");

    expect(ctx.state.ui.error.value).toBe("set-active-failed");
    expect(ctx.state.ui.isSwitching.value).toBeNull();
  });

  it("clears mascot message when mascot card is disabled", async () => {
    const ctx = setup();
    ctx.state.identity.showMascotCard.value = false;
    ctx.state.model.mascotMessage.value = {
      id: "existing",
      kind: "nudge",
      title: "Old",
      body: "Old",
      cta_label: null,
      cta_route: null,
    };

    await ctx.runtime.refreshMascotMessage();

    expect(ctx.state.model.mascotMessage.value).toBeNull();
  });
});
