import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { ProfileSummary } from "@/schemas/ipc";
import {
  createProfilesCommands,
  type ProfilesCommandDeps,
} from "@/features/workspace/composables/profilesCommands";

function profile(id: string, name: string): ProfileSummary {
  return {
    id,
    name,
    created_at: "2026-03-01T10:00:00Z",
    is_active: false,
    talks_count: 0,
    size_bytes: 0,
    last_opened_at: null,
  };
}

function setup(overrides: Partial<ProfilesCommandDeps> = {}) {
  const focus = vi.fn();
  const select = vi.fn();
  const inputRef = { focus, select } as unknown as HTMLInputElement;
  const scrollIntoView = vi.fn();

  const state = {
    routeName: ref<string | symbol | null | undefined>("profiles"),
    profiles: ref([profile("profile-1", "Alpha"), profile("profile-2", "Beta")]),
    activeProfileId: ref<string | null | undefined>("profile-1"),
    name: ref(""),
    error: ref<string | null>(null),
    isSaving: ref(false),
    isRenaming: ref(false),
    deletingId: ref<string | null>(null),
    editingId: ref<string | null>(null),
    renameValue: ref(""),
    renameOriginal: ref(""),
    deleteTarget: ref<ProfileSummary | null>(null),
  };

  const refs = {
    createInput: ref({ inputRef }),
    createSection: ref({ scrollIntoView } as unknown as HTMLElement),
    focusRenameInput: vi.fn(),
  };

  const deps: ProfilesCommandDeps = {
    t: (key: string) => key,
    nextTick: async (fn?: () => void) => {
      fn?.();
    },
    resolveInputElement: () => inputRef,
    hasDuplicateName: (profiles, nextName, exceptId) =>
      profiles.some(
        (entry) =>
          entry.id !== exceptId && entry.name.trim().toLowerCase() === nextName.trim().toLowerCase()
      ),
    createProfile: async () => {},
    switchProfile: async () => {},
    renameProfile: async () => {},
    deleteProfile: async () => {},
    toLocalizedError: (_t, err) => (err instanceof Error ? err.message : String(err)),
    pushHome: async () => {},
    ...overrides,
  };

  return {
    state,
    refs,
    deps,
    focus,
    select,
    scrollIntoView,
    commands: createProfilesCommands({
      state,
      refs,
      deps,
    }),
  };
}

describe("profilesCommands", () => {
  it("focuses the create form input", async () => {
    const ctx = setup();

    await ctx.commands.focusCreateForm();

    expect(ctx.scrollIntoView).toHaveBeenCalled();
    expect(ctx.focus).toHaveBeenCalled();
    expect(ctx.select).toHaveBeenCalled();
  });

  it("rejects empty or duplicate profile names before create", async () => {
    const ctx = setup();

    await ctx.commands.createProfile();
    expect(ctx.state.error.value).toBe("profiles.name_required");

    ctx.state.name.value = "Alpha";
    await ctx.commands.createProfile();
    expect(ctx.state.error.value).toBe("profiles.name_exists");
  });

  it("creates a profile then navigates home", async () => {
    const createProfile = vi.fn(async () => {});
    const pushHome = vi.fn(async () => {});
    const ctx = setup({ createProfile, pushHome });
    ctx.state.name.value = "Team Alpha";

    await ctx.commands.createProfile();

    expect(createProfile).toHaveBeenCalledWith("Team Alpha");
    expect(pushHome).toHaveBeenCalledTimes(1);
    expect(ctx.state.name.value).toBe("");
    expect(ctx.state.isSaving.value).toBe(false);
  });

  it("switches only when the target profile differs from the active profile", async () => {
    const switchProfile = vi.fn(async () => {});
    const pushHome = vi.fn(async () => {});
    const ctx = setup({ switchProfile, pushHome });

    await ctx.commands.switchProfile("profile-1");
    expect(switchProfile).not.toHaveBeenCalled();

    await ctx.commands.switchProfile("profile-2");
    expect(switchProfile).toHaveBeenCalledWith("profile-2");
    expect(pushHome).toHaveBeenCalledTimes(1);
  });

  it("starts rename mode and focuses the matching input", () => {
    const ctx = setup();

    ctx.commands.startRename("profile-2", "Beta");

    expect(ctx.state.editingId.value).toBe("profile-2");
    expect(ctx.state.renameValue.value).toBe("Beta");
    expect(ctx.refs.focusRenameInput).toHaveBeenCalledWith("profile-2");
  });

  it("blocks duplicate rename and keeps editing state active", async () => {
    const ctx = setup();
    ctx.state.editingId.value = "profile-2";
    ctx.state.renameOriginal.value = "Beta";
    ctx.state.renameValue.value = "Alpha";

    await ctx.commands.confirmRename("profile-2");

    expect(ctx.state.error.value).toBe("profiles.name_exists");
    expect(ctx.state.editingId.value).toBe("profile-2");
  });

  it("deletes the current target and only navigates home on the profiles route", async () => {
    const deleteProfile = vi.fn(async () => {});
    const pushHome = vi.fn(async () => {});
    const ctx = setup({ deleteProfile, pushHome });
    ctx.state.routeName.value = "home";
    ctx.commands.requestDelete(profile("profile-1", "Alpha"));

    await ctx.commands.confirmDelete();

    expect(deleteProfile).toHaveBeenCalledWith("profile-1");
    expect(pushHome).not.toHaveBeenCalled();

    ctx.commands.requestDelete(profile("profile-2", "Beta"));
    ctx.state.routeName.value = "profiles";
    await ctx.commands.confirmDelete();

    expect(deleteProfile).toHaveBeenCalledWith("profile-2");
    expect(pushHome).toHaveBeenCalledTimes(1);
    expect(ctx.state.deleteTarget.value).toBeNull();
  });
});
