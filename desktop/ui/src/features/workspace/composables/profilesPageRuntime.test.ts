import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { createProfilesState } from "./profilesPageHelpers";
import { createProfilesActions } from "./profilesPageRuntime";

const mockWorkspaceStore = vi.hoisted(() => ({
  createProfile: vi.fn(async () => "p-new"),
  switchProfile: vi.fn(async () => {}),
  renameProfile: vi.fn(async () => {}),
  deleteProfile: vi.fn(async () => {}),
}));

vi.mock("@/stores/app", () => ({
  sessionStore: {
    ensureBootstrapped: vi.fn(async () => {}),
  },
  workspaceStore: mockWorkspaceStore,
}));

function profile(id: string, name: string) {
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

describe("profilesPageRuntime", () => {
  it("uses current routeName ref when confirming delete", async () => {
    const state = createProfilesState();
    const routeName = ref<string | symbol | null | undefined>("home");
    const pushHome = vi.fn(async () => {});

    const actions = createProfilesActions({
      t: (key: string) => key,
      focusRenameInput: vi.fn(),
      pushHome,
      state: {
        identity: {
          routeName,
          createInput: ref(null),
          createSection: ref(null),
          activeProfileId: ref<string | null | undefined>("p1"),
        },
        model: state,
      },
    });

    actions.profileMenuItems(profile("p1", "Alpha"))[1]?.onSelect?.();
    await actions.confirmDelete();

    expect(mockWorkspaceStore.deleteProfile).toHaveBeenCalledWith("p1");
    expect(pushHome).not.toHaveBeenCalled();

    actions.profileMenuItems(profile("p2", "Beta"))[1]?.onSelect?.();
    routeName.value = "profiles";
    await actions.confirmDelete();

    expect(mockWorkspaceStore.deleteProfile).toHaveBeenCalledWith("p2");
    expect(pushHome).toHaveBeenCalledTimes(1);
  });
});
