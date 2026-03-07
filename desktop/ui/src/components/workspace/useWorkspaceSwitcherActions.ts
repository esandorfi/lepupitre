import { nextTick, watch } from "vue";
import {
  applyWorkspaceToolbarColor,
  cycleWorkspaceToolbarColor,
} from "@/lib/workspaceToolbarColor";
import {
  resolveButtonElement,
  resolveInputElement,
} from "@/components/workspace/workspaceSwitcher.refs";
import { createWorkspaceProfileActions } from "@/components/workspace/useWorkspaceSwitcherCreate";
import { createWorkspaceRenameActions } from "@/components/workspace/useWorkspaceSwitcherRename";
import type { WorkspaceSwitcherActionDeps } from "@/components/workspace/workspaceSwitcherActions.shared";

function createPanelActions(
  deps: WorkspaceSwitcherActionDeps,
  confirmRename: (profileId: string) => Promise<void>
) {
  function resetPanelTransientState() {
    deps.error.value = null;
    deps.search.value = "";
    deps.createOpen.value = false;
    deps.createName.value = "";
    deps.editingId.value = null;
    deps.renameValue.value = "";
    deps.renameOriginal.value = "";
  }

  function closePanel() {
    if (deps.editingId.value) {
      void confirmRename(deps.editingId.value);
    }
    deps.open.value = false;
    resetPanelTransientState();
    nextTick(() => {
      resolveButtonElement(deps.triggerRef.value)?.focus();
    });
  }

  function onPopoverOpenChange(nextOpen: boolean) {
    if (deps.open.value === nextOpen) {
      return;
    }
    if (!nextOpen && deps.editingId.value) {
      void confirmRename(deps.editingId.value);
    }
    deps.open.value = nextOpen;
    if (!nextOpen) {
      resetPanelTransientState();
    }
  }

  async function toggleCreate() {
    deps.createOpen.value = !deps.createOpen.value;
    deps.error.value = null;
    if (!deps.createOpen.value) {
      deps.createName.value = "";
      return;
    }
    deps.editingId.value = null;
    await nextTick();
    const input = resolveInputElement(deps.createInputRef.value);
    input?.focus();
    input?.select();
  }

  return {
    closePanel,
    onPopoverOpenChange,
    toggleCreate,
  };
}

function createRowActions(
  deps: WorkspaceSwitcherActionDeps,
  selectProfile: (profileId: string) => Promise<void>
) {
  function cycleToolbarColor(profileId: string) {
    cycleWorkspaceToolbarColor(profileId);
    deps.toolbarColorTick.value += 1;
    if (profileId === deps.activeProfileId.value) {
      applyWorkspaceToolbarColor(profileId, deps.theme.value);
    }
  }

  function onProfileRowActivate(profileId: string) {
    if (deps.editingId.value || deps.deletingId.value) {
      return;
    }
    if (profileId === deps.activeProfileId.value) {
      cycleToolbarColor(profileId);
      return;
    }
    void selectProfile(profileId);
  }

  return {
    onProfileRowActivate,
  };
}

function setupWorkspaceSwitcherEffects(deps: WorkspaceSwitcherActionDeps) {
  watch(deps.open, async (nextOpen) => {
    if (nextOpen) {
      await nextTick();
      if (deps.showSearch.value) {
        resolveInputElement(deps.searchInputRef.value)?.focus();
      }
    }
  });

  watch(
    [deps.activeProfileId, deps.theme],
    ([profileId, currentTheme]) => {
      applyWorkspaceToolbarColor(profileId, currentTheme);
    },
    { immediate: true }
  );
}

export function createWorkspaceSwitcherActions(deps: WorkspaceSwitcherActionDeps) {
  const renameActions = createWorkspaceRenameActions(deps);
  const panelActions = createPanelActions(deps, renameActions.confirmRename);
  const profileActions = createWorkspaceProfileActions(deps, panelActions.closePanel);
  const rowActions = createRowActions(deps, profileActions.selectProfile);
  setupWorkspaceSwitcherEffects(deps);

  return {
    closePanel: panelActions.closePanel,
    onPopoverOpenChange: panelActions.onPopoverOpenChange,
    toggleCreate: panelActions.toggleCreate,
    createProfileInline: profileActions.createProfileInline,
    selectProfile: profileActions.selectProfile,
    confirmRename: renameActions.confirmRename,
    onPanelMouseDownCapture: renameActions.onPanelMouseDownCapture,
    onRenameEditorFocusOut: renameActions.onRenameEditorFocusOut,
    rowMenuItems: renameActions.rowMenuItems,
    cancelDelete: renameActions.cancelDelete,
    confirmDelete: profileActions.confirmDelete,
    onProfileRowActivate: rowActions.onProfileRowActivate,
  };
}
