import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  createProfilesCreateSwitchActions,
  type ProfilesCreateSwitchDeps,
} from "./profilesCreateSwitchActions";

function setup(overrides: Partial<ProfilesCreateSwitchDeps> = {}) {
  const focus = vi.fn();
  const select = vi.fn();
  const inputRef = { focus, select } as unknown as HTMLInputElement;
  const scrollIntoView = vi.fn();

  const state = {
    identity: {
      createInput: ref({ inputRef }),
      createSection: ref({ scrollIntoView } as unknown as HTMLElement),
      activeProfileId: ref<string | null | undefined>("profile-1"),
    },
    model: {
      name: ref(""),
    },
    ui: {
      error: ref<string | null>(null),
      isSaving: ref(false),
    },
  };

  const deps: ProfilesCreateSwitchDeps = {
    t: (key: string) => key,
    nextTick: async () => {},
    resolveInputElement: () => inputRef,
    hasDuplicateName: () => false,
    createProfile: async () => {},
    switchProfile: async () => {},
    toLocalizedError: (_t, err) => (err instanceof Error ? err.message : String(err)),
    pushHome: async () => {},
    ...overrides,
  };

  return {
    state,
    deps,
    focus,
    select,
    scrollIntoView,
    actions: createProfilesCreateSwitchActions({
      t: deps.t,
      pushHome: deps.pushHome,
      state,
      deps,
    }),
  };
}

describe("profilesCreateSwitchActions", () => {
  it("focuses create form input", async () => {
    const ctx = setup();

    await ctx.actions.focusCreateForm();

    expect(ctx.scrollIntoView).toHaveBeenCalled();
    expect(ctx.focus).toHaveBeenCalled();
    expect(ctx.select).toHaveBeenCalled();
  });

  it("rejects empty profile name", async () => {
    const ctx = setup();

    await ctx.actions.createProfile();

    expect(ctx.state.ui.error.value).toBe("profiles.name_required");
  });

  it("creates profile then navigates home", async () => {
    const createProfile = vi.fn(async () => {});
    const pushHome = vi.fn(async () => {});
    const ctx = setup({
      createProfile,
      pushHome,
    });
    ctx.state.model.name.value = "Team Alpha";

    await ctx.actions.createProfile();

    expect(createProfile).toHaveBeenCalledWith("Team Alpha");
    expect(pushHome).toHaveBeenCalled();
    expect(ctx.state.model.name.value).toBe("");
    expect(ctx.state.ui.isSaving.value).toBe(false);
  });

  it("switches profile only when different", async () => {
    const switchProfile = vi.fn(async () => {});
    const pushHome = vi.fn(async () => {});
    const ctx = setup({
      switchProfile,
      pushHome,
    });

    await ctx.actions.switchProfile("profile-1");
    expect(switchProfile).not.toHaveBeenCalled();

    await ctx.actions.switchProfile("profile-2");
    expect(switchProfile).toHaveBeenCalledWith("profile-2");
    expect(pushHome).toHaveBeenCalled();
  });
});
