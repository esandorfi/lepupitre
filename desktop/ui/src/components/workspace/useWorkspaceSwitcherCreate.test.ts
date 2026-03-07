import { computed, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceSwitcherActionDeps } from "./workspaceSwitcherActions.shared";
import { createWorkspaceProfileActions } from "./useWorkspaceSwitcherCreate";

const createMocks = vi.hoisted(() => ({
  createProfileWithContext: vi.fn(async () => "profile-new"),
  switchProfileWithContext: vi.fn(async () => {}),
  deleteProfileWithContext: vi.fn(async () => {}),
  hasDuplicateName: vi.fn(() => false),
  toWorkspaceError: vi.fn((_t, err) => (err instanceof Error ? err.message : String(err))),
}));

vi.mock("@/components/workspace/workspaceSwitcherActions.shared", () => createMocks);

function setup() {
  const profilesRef = ref([{ id: "p1", name: "Alpha" }]);
  const activeProfileIdRef = ref<string | null>("p1");

  const deps = {
    t: (key: string) => key,
    router: { push: vi.fn(async () => {}) },
    open: ref(false),
    search: ref(""),
    error: ref<string | null>(null),
    switchingId: ref<string | null>(null),
    createOpen: ref(true),
    createName: ref(""),
    isCreating: ref(false),
    editingId: ref<string | null>(null),
    renameValue: ref(""),
    renameOriginal: ref(""),
    isRenaming: ref(false),
    deletingId: ref<string | null>(null),
    deleteTarget: ref<{ id: string; name: string } | null>(null),
    toolbarColorTick: ref(0),
    triggerRef: ref(null),
    searchInputRef: ref(null),
    createInputRef: ref(null),
    renameInputRef: ref(null),
    profiles: computed(() => profilesRef.value),
    activeProfileId: computed(() => activeProfileIdRef.value),
    showSearch: computed(() => false),
  } as unknown as WorkspaceSwitcherActionDeps;

  const closePanel = vi.fn();
  const actions = createWorkspaceProfileActions(deps, closePanel);
  return { deps, closePanel, actions };
}

describe("useWorkspaceSwitcherCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates empty and duplicate profile names", async () => {
    const { deps, actions } = setup();
    deps.createName.value = "   ";

    await actions.createProfileInline();
    expect(deps.error.value).toBe("profiles.name_required");

    createMocks.hasDuplicateName.mockReturnValueOnce(true);
    deps.createName.value = "Alpha";
    await actions.createProfileInline();
    expect(deps.error.value).toBe("profiles.name_exists");
  });

  it("creates profile then navigates home and closes panel", async () => {
    const { deps, closePanel, actions } = setup();
    deps.createName.value = "Team A";

    await actions.createProfileInline();

    expect(createMocks.createProfileWithContext).toHaveBeenCalledWith("Team A");
    expect(deps.router.push).toHaveBeenCalledWith("/");
    expect(closePanel).toHaveBeenCalled();
    expect(deps.createName.value).toBe("");
    expect(deps.createOpen.value).toBe(false);
    expect(deps.isCreating.value).toBe(false);
  });

  it("switches and deletes profiles through context helpers", async () => {
    const { deps, closePanel, actions } = setup();

    await actions.selectProfile("p1");
    expect(createMocks.switchProfileWithContext).not.toHaveBeenCalled();

    await actions.selectProfile("p2");
    expect(createMocks.switchProfileWithContext).toHaveBeenCalledWith("p2");
    expect(deps.router.push).toHaveBeenCalledWith("/");
    expect(closePanel).toHaveBeenCalled();

    deps.deleteTarget.value = { id: "p2", name: "Beta" };
    await actions.confirmDelete();
    expect(createMocks.deleteProfileWithContext).toHaveBeenCalledWith("p2");
    expect(deps.deleteTarget.value).toBeNull();
    expect(deps.editingId.value).toBeNull();
    expect(deps.deletingId.value).toBeNull();
  });
});
