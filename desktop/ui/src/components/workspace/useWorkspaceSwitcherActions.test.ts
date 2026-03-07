import { computed, nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Theme } from "@/lib/theme";
import type { ProfileSummary } from "@/schemas/ipc";
import type {
  ButtonRefTarget,
  InputRefTarget,
} from "@/components/workspace/workspaceSwitcher.refs";
import type { WorkspaceSwitcherActionDeps } from "./workspaceSwitcherActions.shared";
import { createWorkspaceSwitcherActions } from "./useWorkspaceSwitcherActions";

const toolbarMocks = vi.hoisted(() => ({
  applyWorkspaceToolbarColor: vi.fn(),
  cycleWorkspaceToolbarColor: vi.fn(),
}));

const refsMocks = vi.hoisted(() => ({
  resolveButtonElement: vi.fn(),
  resolveInputElement: vi.fn(),
}));

const profileActionMocks = vi.hoisted(() => ({
  createProfileInline: vi.fn(async () => {}),
  selectProfile: vi.fn(async () => {}),
  confirmDelete: vi.fn(async () => {}),
}));

const renameActionMocks = vi.hoisted(() => ({
  confirmRename: vi.fn(async () => {}),
  onPanelMouseDownCapture: vi.fn(),
  onRenameEditorFocusOut: vi.fn(),
  rowMenuItems: vi.fn(() => []),
  cancelDelete: vi.fn(),
}));

vi.mock("@/lib/workspaceToolbarColor", () => toolbarMocks);
vi.mock("@/components/workspace/workspaceSwitcher.refs", () => refsMocks);
vi.mock("@/components/workspace/useWorkspaceSwitcherCreate", () => ({
  createWorkspaceProfileActions: vi.fn(() => profileActionMocks),
}));
vi.mock("@/components/workspace/useWorkspaceSwitcherRename", () => ({
  createWorkspaceRenameActions: vi.fn(() => renameActionMocks),
}));

function profile(id: string, name: string, lastOpenedAt: string | null = null): ProfileSummary {
  return {
    id,
    name,
    created_at: "2026-03-01T10:00:00Z",
    is_active: false,
    talks_count: 0,
    size_bytes: 0,
    last_opened_at: lastOpenedAt,
  };
}

function setup() {
  const profilesRef = ref<ProfileSummary[]>([profile("p1", "Alpha"), profile("p2", "Beta")]);
  const activeProfileIdRef = ref<string | null>("p1");
  const showSearchRef = ref(true);

  const open = ref(false);
  const search = ref("legacy");
  const error = ref<string | null>("old");
  const switchingId = ref<string | null>(null);
  const createOpen = ref(false);
  const createName = ref("draft");
  const isCreating = ref(false);
  const editingId = ref<string | null>(null);
  const renameValue = ref("Alpha renamed");
  const renameOriginal = ref("Alpha");
  const isRenaming = ref(false);
  const deletingId = ref<string | null>(null);
  const deleteTarget = ref<{ id: string; name: string } | null>(null);
  const toolbarColorTick = ref(0);

  const triggerButton = { focus: vi.fn() } as unknown as HTMLButtonElement;
  const searchInput = { focus: vi.fn() } as unknown as HTMLInputElement;
  const createInput = { focus: vi.fn(), select: vi.fn() } as unknown as HTMLInputElement;
  const triggerFocus = triggerButton.focus as unknown as ReturnType<typeof vi.fn>;
  const searchFocus = searchInput.focus as unknown as ReturnType<typeof vi.fn>;
  const createFocus = createInput.focus as unknown as ReturnType<typeof vi.fn>;
  const createSelect = createInput.select as unknown as ReturnType<typeof vi.fn>;

  const triggerRef = ref<ButtonRefTarget>({ $el: null });
  const searchInputRef = ref<InputRefTarget>({ inputRef: null });
  const createInputRef = ref<InputRefTarget>({ inputRef: null });
  const renameInputRef = ref<InputRefTarget>(null);

  refsMocks.resolveButtonElement.mockReturnValue(triggerButton);
  refsMocks.resolveInputElement.mockImplementation((target: unknown) => {
    if (target === searchInputRef.value) {
      return searchInput;
    }
    if (target === createInputRef.value) {
      return createInput;
    }
    return null;
  });

  const deps: WorkspaceSwitcherActionDeps = {
    t: (key: string) => key,
    router: { push: vi.fn(async () => {}) } as unknown as WorkspaceSwitcherActionDeps["router"],
    theme: ref<Theme>("orange"),
    open,
    search,
    error,
    switchingId,
    createOpen,
    createName,
    isCreating,
    editingId,
    renameValue,
    renameOriginal,
    isRenaming,
    deletingId,
    deleteTarget,
    toolbarColorTick,
    triggerRef,
    searchInputRef,
    createInputRef,
    renameInputRef,
    profiles: computed(() => profilesRef.value),
    activeProfileId: computed(() => activeProfileIdRef.value),
    showSearch: computed(() => showSearchRef.value),
  };

  return {
    deps,
    open,
    search,
    error,
    createOpen,
    createName,
    editingId,
    renameValue,
    renameOriginal,
    deletingId,
    showSearchRef,
    triggerFocus,
    searchFocus,
    createFocus,
    createSelect,
    actions: createWorkspaceSwitcherActions(deps),
  };
}

describe("useWorkspaceSwitcherActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes and resets the panel, confirms rename and restores trigger focus", async () => {
    const ctx = setup();
    ctx.open.value = true;
    ctx.createOpen.value = true;
    ctx.editingId.value = "p1";

    ctx.actions.closePanel();
    await nextTick();

    expect(renameActionMocks.confirmRename).toHaveBeenCalledWith("p1");
    expect(ctx.open.value).toBe(false);
    expect(ctx.search.value).toBe("");
    expect(ctx.error.value).toBeNull();
    expect(ctx.createOpen.value).toBe(false);
    expect(ctx.createName.value).toBe("");
    expect(ctx.editingId.value).toBeNull();
    expect(ctx.renameValue.value).toBe("");
    expect(ctx.renameOriginal.value).toBe("");
    expect(ctx.triggerFocus).toHaveBeenCalled();
  });

  it("activates selected profile row or cycles toolbar color for active row", () => {
    const ctx = setup();
    toolbarMocks.applyWorkspaceToolbarColor.mockClear();
    toolbarMocks.cycleWorkspaceToolbarColor.mockClear();

    ctx.actions.onProfileRowActivate("p1");
    expect(toolbarMocks.cycleWorkspaceToolbarColor).toHaveBeenCalledWith("p1");
    expect(toolbarMocks.applyWorkspaceToolbarColor).toHaveBeenCalledWith("p1", "orange");

    ctx.actions.onProfileRowActivate("p2");
    expect(profileActionMocks.selectProfile).toHaveBeenCalledWith("p2");
  });

  it("ignores row activation while editing or deleting", () => {
    const ctx = setup();
    ctx.editingId.value = "p1";

    ctx.actions.onProfileRowActivate("p2");
    expect(profileActionMocks.selectProfile).not.toHaveBeenCalled();

    ctx.editingId.value = null;
    ctx.deletingId.value = "p2";
    ctx.actions.onProfileRowActivate("p2");
    expect(profileActionMocks.selectProfile).not.toHaveBeenCalled();
  });

  it("toggles create mode and focuses create input when opening", async () => {
    const ctx = setup();
    ctx.error.value = "legacy";

    await ctx.actions.toggleCreate();
    expect(ctx.createOpen.value).toBe(true);
    expect(ctx.editingId.value).toBeNull();
    expect(ctx.error.value).toBeNull();
    expect(ctx.createFocus).toHaveBeenCalled();
    expect(ctx.createSelect).toHaveBeenCalled();

    ctx.createName.value = "to-clear";
    await ctx.actions.toggleCreate();
    expect(ctx.createOpen.value).toBe(false);
    expect(ctx.createName.value).toBe("");
  });

  it("focuses search input when panel opens and search is enabled", async () => {
    const ctx = setup();
    ctx.showSearchRef.value = true;

    ctx.open.value = true;
    await nextTick();
    await nextTick();

    expect(ctx.searchFocus).toHaveBeenCalled();
  });
});
