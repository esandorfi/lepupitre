import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { ProfileSummary } from "@/schemas/ipc";
import {
  createProfilesManageActions,
  type ProfilesManageDeps,
} from "./profilesManageActions";

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

function setup(overrides: Partial<ProfilesManageDeps> = {}) {
  const state = {
    identity: {
      routeName: ref<string | symbol | null | undefined>("profiles"),
    },
    model: {
      renameValue: ref(""),
      renameOriginal: ref(""),
      deleteTarget: ref<ProfileSummary | null>(null),
    },
    ui: {
      error: ref<string | null>(null),
      isRenaming: ref(false),
      deletingId: ref<string | null>(null),
      editingId: ref<string | null>(null),
    },
  };

  const deps: ProfilesManageDeps = {
    t: (key: string) => key,
    nextTick: async (fn?: () => void) => {
      fn?.();
    },
    focusRenameInput: vi.fn(),
    hasDuplicateName: () => false,
    renameProfile: async () => {},
    deleteProfile: async () => {},
    toLocalizedError: (_t, err) => (err instanceof Error ? err.message : String(err)),
    pushHome: async () => {},
    ...overrides,
  };

  return {
    state,
    deps,
    actions: createProfilesManageActions({
      t: deps.t,
      focusRenameInput: deps.focusRenameInput,
      pushHome: deps.pushHome,
      state,
      deps,
    }),
  };
}

describe("profilesManageActions", () => {
  it("opens rename mode and focuses rename input", () => {
    const focusRenameInput = vi.fn();
    const ctx = setup({ focusRenameInput });

    ctx.actions.profileMenuItems(profile("p1", "Alpha"))[0]?.onSelect?.();

    expect(ctx.state.ui.editingId.value).toBe("p1");
    expect(ctx.state.model.renameValue.value).toBe("Alpha");
    expect(focusRenameInput).toHaveBeenCalledWith("p1");
  });

  it("confirms rename and clears editing state", async () => {
    const renameProfile = vi.fn(async () => {});
    const ctx = setup({ renameProfile });
    ctx.state.ui.editingId.value = "p1";
    ctx.state.model.renameOriginal.value = "Alpha";
    ctx.state.model.renameValue.value = "Alpha Renamed";

    await ctx.actions.confirmRename("p1");

    expect(renameProfile).toHaveBeenCalledWith("p1", "Alpha Renamed");
    expect(ctx.state.ui.editingId.value).toBeNull();
    expect(ctx.state.ui.isRenaming.value).toBe(false);
  });

  it("blocks duplicate rename", async () => {
    const renameProfile = vi.fn(async () => {});
    const ctx = setup({
      hasDuplicateName: () => true,
      renameProfile,
    });
    ctx.state.model.renameOriginal.value = "Alpha";
    ctx.state.model.renameValue.value = "Beta";

    await ctx.actions.confirmRename("p1");

    expect(ctx.state.ui.error.value).toBe("profiles.name_exists");
    expect(renameProfile).not.toHaveBeenCalled();
  });

  it("deletes profile and navigates home on profiles route", async () => {
    const deleteProfile = vi.fn(async () => {});
    const pushHome = vi.fn(async () => {});
    const ctx = setup({
      deleteProfile,
      pushHome,
    });
    ctx.actions.profileMenuItems(profile("p1", "Alpha"))[1]?.onSelect?.();

    await ctx.actions.confirmDelete();

    expect(deleteProfile).toHaveBeenCalledWith("p1");
    expect(pushHome).toHaveBeenCalled();
    expect(ctx.state.model.deleteTarget.value).toBeNull();
  });
});
