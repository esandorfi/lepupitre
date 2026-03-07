import { computed, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceSwitcherActionDeps } from "./workspaceSwitcherActions.shared";
import { createWorkspaceRenameActions } from "./useWorkspaceSwitcherRename";

const renameMocks = vi.hoisted(() => ({
  workspaceStore: {
    renameProfile: vi.fn(async () => {}),
  },
  resolveInputElement: vi.fn(),
  hasDuplicateName: vi.fn(() => false),
  toWorkspaceError: vi.fn((_t, err) => (err instanceof Error ? err.message : String(err))),
}));

vi.mock("@/stores/app", () => ({
  workspaceStore: renameMocks.workspaceStore,
}));

vi.mock("@/components/workspace/workspaceSwitcher.refs", () => ({
  resolveInputElement: renameMocks.resolveInputElement,
}));

vi.mock("@/components/workspace/workspaceSwitcherActions.shared", async () => {
  const actual = await vi.importActual("./workspaceSwitcherActions.shared");
  return {
    ...actual,
    hasDuplicateName: renameMocks.hasDuplicateName,
    toWorkspaceError: renameMocks.toWorkspaceError,
  };
});

function setup() {
  const deps = {
    t: (key: string) => key,
    router: { push: vi.fn(async () => {}) },
    theme: ref("orange"),
    open: ref(false),
    search: ref(""),
    error: ref<string | null>(null),
    switchingId: ref<string | null>(null),
    createOpen: ref(false),
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
    profiles: computed(() => [{ id: "p1", name: "Alpha" }]),
    activeProfileId: computed(() => "p1"),
    showSearch: computed(() => false),
  } as unknown as WorkspaceSwitcherActionDeps;

  renameMocks.resolveInputElement.mockReturnValue({
    focus: vi.fn(),
    select: vi.fn(),
  });

  const actions = createWorkspaceRenameActions(deps);
  return { deps, actions };
}

describe("useWorkspaceSwitcherRename", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts rename mode via row menu and requests delete target", async () => {
    const { deps, actions } = setup();
    const menuItems = actions.rowMenuItems({ id: "p1", name: "Alpha" });

    menuItems[0]?.onSelect?.();
    expect(deps.editingId.value).toBe("p1");
    expect(deps.renameValue.value).toBe("Alpha");
    expect(deps.renameOriginal.value).toBe("Alpha");
    expect(deps.createOpen.value).toBe(false);

    menuItems[1]?.onSelect?.();
    expect(deps.deleteTarget.value).toEqual({ id: "p1", name: "Alpha" });
  });

  it("confirms rename and handles duplicate-name validation", async () => {
    const { deps, actions } = setup();
    deps.editingId.value = "p1";
    deps.renameOriginal.value = "Alpha";
    deps.renameValue.value = "Alpha Renamed";

    await actions.confirmRename("p1");
    expect(renameMocks.workspaceStore.renameProfile).toHaveBeenCalledWith("p1", "Alpha Renamed");
    expect(deps.editingId.value).toBeNull();
    expect(deps.renameValue.value).toBe("");
    expect(deps.renameOriginal.value).toBe("");

    deps.editingId.value = "p1";
    deps.renameOriginal.value = "Alpha";
    deps.renameValue.value = "Beta";
    renameMocks.hasDuplicateName.mockReturnValueOnce(true);
    await actions.confirmRename("p1");
    expect(deps.error.value).toBe("profiles.name_exists");
  });

  it("cancels delete target and ignores confirm when not editing same profile", async () => {
    const { deps, actions } = setup();
    deps.deleteTarget.value = { id: "p1", name: "Alpha" };

    actions.cancelDelete();
    expect(deps.deleteTarget.value).toBeNull();

    deps.editingId.value = "p2";
    deps.renameValue.value = "New";
    deps.renameOriginal.value = "Old";
    await actions.confirmRename("p1");
    expect(renameMocks.workspaceStore.renameProfile).not.toHaveBeenCalled();
  });
});
