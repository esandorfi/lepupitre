import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useWorkspaceSwitcher } from "./useWorkspaceSwitcher";

const switcherMocks = vi.hoisted(() => ({
  useI18n: vi.fn(() => ({ t: (key: string) => key })),
  useRouter: vi.fn(() => ({ push: vi.fn(async () => {}) })),
  useTheme: vi.fn(() => ({ theme: ref("orange") })),
  createWorkspaceSwitcherModel: vi.fn(),
  createWorkspaceSwitcherActions: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: switcherMocks.useI18n,
}));

vi.mock("vue-router", () => ({
  useRouter: switcherMocks.useRouter,
}));

vi.mock("@/lib/theme", () => ({
  useTheme: switcherMocks.useTheme,
}));

vi.mock("@/components/workspace/useWorkspaceSwitcherModel", () => ({
  createWorkspaceSwitcherModel: switcherMocks.createWorkspaceSwitcherModel,
}));

vi.mock("@/components/workspace/useWorkspaceSwitcherActions", () => ({
  createWorkspaceSwitcherActions: switcherMocks.createWorkspaceSwitcherActions,
}));

describe("useWorkspaceSwitcher", () => {
  it("wires model/actions and exposes state, handlers and popover constants", () => {
    const model = {
      profiles: computed(() => [{ id: "p1", name: "Alpha" }]),
      activeProfileId: computed(() => "p1"),
      showSearch: computed(() => false),
      recentProfiles: computed(() => []),
      showRecentSection: computed(() => false),
      mainProfiles: computed(() => [{ id: "p1", name: "Alpha" }]),
      hasNoProfiles: computed(() => false),
      hasNoSearchResults: computed(() => false),
      currentLabel: computed(() => "Alpha"),
      deleteDialogTitle: computed(() => "Delete Alpha?"),
      deleteDialogBody: computed(() => "Confirm"),
      currentToolbarColorStyle: computed(() => ({ background: "x" })),
      rowMenuButtonAriaLabel: vi.fn(() => "menu"),
      workspaceMetaLabel: vi.fn(() => "meta"),
      toolbarColorPreviewStyle: vi.fn(() => ({ border: "x" })),
      activeRowStyle: vi.fn(() => ({ color: "x" })),
    };
    const actions = {
      closePanel: vi.fn(),
      onPopoverOpenChange: vi.fn(),
      toggleCreate: vi.fn(),
      createProfileInline: vi.fn(),
      selectProfile: vi.fn(),
      confirmRename: vi.fn(),
      onPanelMouseDownCapture: vi.fn(),
      onRenameEditorFocusOut: vi.fn(),
      rowMenuItems: vi.fn(),
      cancelDelete: vi.fn(),
      confirmDelete: vi.fn(),
      onProfileRowActivate: vi.fn(),
    };
    switcherMocks.createWorkspaceSwitcherModel.mockReturnValue(model);
    switcherMocks.createWorkspaceSwitcherActions.mockReturnValue(actions);

    const switcher = useWorkspaceSwitcher();

    expect(switcherMocks.createWorkspaceSwitcherModel).toHaveBeenCalled();
    expect(switcherMocks.createWorkspaceSwitcherActions).toHaveBeenCalled();
    expect(switcher.PANEL_POPOVER_CONTENT).toEqual({
      align: "end",
      side: "bottom",
      sideOffset: 8,
    });
    expect(switcher.PANEL_POPOVER_UI.content).toContain("rounded-2xl");
    expect(switcher.activeProfileId.value).toBe("p1");
    expect(switcher.currentLabel.value).toBe("Alpha");
    expect(switcher.closePanel).toBe(actions.closePanel);
    expect(switcher.createProfileInline).toBe(actions.createProfileInline);
    expect(switcher.rowMenuButtonAriaLabel).toBe(model.rowMenuButtonAriaLabel);
    expect(switcher.workspaceMetaLabel).toBe(model.workspaceMetaLabel);
  });
});
