import { nextTick, watch, type ComputedRef, type Ref } from "vue";
import type { Router } from "vue-router";
import type { ProfileSummary } from "@/schemas/ipc";
import type { Theme } from "@/lib/theme";
import {
  applyWorkspaceToolbarColor,
  cycleWorkspaceToolbarColor,
} from "@/lib/workspaceToolbarColor";
import { talksStore, trainingStore, workspaceStore } from "@/stores/app";
import {
  resolveButtonElement,
  resolveInputElement,
  type ButtonRefTarget,
  type InputRefTarget,
} from "@/components/workspace/workspaceSwitcher.refs";
import type { Translate } from "@/components/workspace/useWorkspaceSwitcherModel";

type WorkspaceSwitcherActionDeps = {
  t: Translate;
  router: Router;
  theme: Ref<Theme>;
  open: Ref<boolean>;
  search: Ref<string>;
  error: Ref<string | null>;
  switchingId: Ref<string | null>;
  createOpen: Ref<boolean>;
  createName: Ref<string>;
  isCreating: Ref<boolean>;
  editingId: Ref<string | null>;
  renameValue: Ref<string>;
  renameOriginal: Ref<string>;
  isRenaming: Ref<boolean>;
  deletingId: Ref<string | null>;
  deleteTarget: Ref<{ id: string; name: string } | null>;
  toolbarColorTick: Ref<number>;
  triggerRef: Ref<ButtonRefTarget>;
  searchInputRef: Ref<InputRefTarget>;
  createInputRef: Ref<InputRefTarget>;
  renameInputRef: Ref<InputRefTarget>;
  profiles: ComputedRef<ProfileSummary[]>;
  activeProfileId: ComputedRef<string | null>;
  showSearch: ComputedRef<boolean>;
};

function hasDuplicateName(
  profiles: ReadonlyArray<Pick<ProfileSummary, "id" | "name">>,
  nextName: string,
  exceptId?: string
) {
  return profiles.some(
    (profile) =>
      profile.id !== exceptId &&
      profile.name.trim().toLowerCase() === nextName.trim().toLowerCase()
  );
}

function toWorkspaceError(t: Translate, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("recording_active")) {
    return t("profiles.switch_blocked_recording");
  }
  return message;
}

async function refreshProfileContext() {
  await talksStore.loadActiveProject();
  await talksStore.loadProjects();
  await trainingStore.loadDailyQuest();
}

async function createProfileWithContext(name: string) {
  const id = await workspaceStore.createProfile(name);
  await refreshProfileContext();
  return id;
}

async function switchProfileWithContext(profileId: string) {
  await workspaceStore.switchProfile(profileId);
  await refreshProfileContext();
}

async function deleteProfileWithContext(profileId: string) {
  await workspaceStore.deleteProfile(profileId);
  await refreshProfileContext();
}

function createPanelActions(
  deps: WorkspaceSwitcherActionDeps,
  confirmRename: (profileId: string) => Promise<void>
) {
  function closePanel() {
    if (deps.editingId.value) {
      void confirmRename(deps.editingId.value);
    }
    deps.open.value = false;
    deps.error.value = null;
    deps.search.value = "";
    deps.createOpen.value = false;
    deps.createName.value = "";
    deps.editingId.value = null;
    deps.renameValue.value = "";
    deps.renameOriginal.value = "";
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
    if (nextOpen) {
      return;
    }
    deps.error.value = null;
    deps.search.value = "";
    deps.createOpen.value = false;
    deps.createName.value = "";
    deps.editingId.value = null;
    deps.renameValue.value = "";
    deps.renameOriginal.value = "";
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

function createRenameAndDeleteActions(deps: WorkspaceSwitcherActionDeps) {
  function startRename(profileId: string, currentName: string) {
    deps.editingId.value = profileId;
    deps.renameValue.value = currentName;
    deps.renameOriginal.value = currentName;
    deps.createOpen.value = false;
    deps.error.value = null;
    void nextTick(() => {
      const input = resolveInputElement(deps.renameInputRef.value);
      input?.focus();
      input?.select();
    });
  }

  function cancelRename() {
    deps.editingId.value = null;
    deps.renameValue.value = "";
    deps.renameOriginal.value = "";
  }

  async function confirmRename(profileId: string) {
    if (deps.editingId.value !== profileId) {
      return;
    }
    const nextName = deps.renameValue.value.trim();
    const originalTrimmed = deps.renameOriginal.value.trim();
    if (!nextName || nextName === originalTrimmed) {
      cancelRename();
      return;
    }
    cancelRename();
    if (hasDuplicateName(deps.profiles.value, nextName, profileId)) {
      deps.error.value = deps.t("profiles.name_exists");
      return;
    }
    deps.isRenaming.value = true;
    deps.error.value = null;
    try {
      await workspaceStore.renameProfile(profileId, nextName);
    } catch (err) {
      deps.error.value = toWorkspaceError(deps.t, err);
    } finally {
      deps.isRenaming.value = false;
    }
  }

  function onPanelMouseDownCapture(event: MouseEvent) {
    if (!deps.editingId.value) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (resolveInputElement(deps.renameInputRef.value)?.contains(target)) {
      return;
    }
    void confirmRename(deps.editingId.value);
  }

  function onRenameEditorFocusOut(profileId: string, event: FocusEvent) {
    if (deps.editingId.value !== profileId) {
      return;
    }
    const currentTarget = event.currentTarget;
    const nextTarget = event.relatedTarget;
    if (
      currentTarget instanceof HTMLElement &&
      nextTarget instanceof Node &&
      currentTarget.contains(nextTarget)
    ) {
      return;
    }
    void confirmRename(profileId);
  }

  function requestDelete(profileId: string, profileName: string) {
    deps.deleteTarget.value = { id: profileId, name: profileName };
    deps.error.value = null;
  }

  function rowMenuItems(profile: { id: string; name: string }) {
    return [
      {
        label: deps.t("profiles.rename"),
        disabled: deps.isRenaming.value,
        onSelect: () => startRename(profile.id, profile.name),
      },
      {
        label: deps.t("profiles.delete"),
        color: "error" as const,
        disabled: deps.deletingId.value === profile.id,
        onSelect: () => requestDelete(profile.id, profile.name),
      },
    ];
  }

  function cancelDelete() {
    deps.deleteTarget.value = null;
  }

  return {
    startRename,
    confirmRename,
    onPanelMouseDownCapture,
    onRenameEditorFocusOut,
    rowMenuItems,
    cancelDelete,
  };
}

function createProfileActions(
  deps: WorkspaceSwitcherActionDeps,
  closePanel: () => void
) {
  async function createProfileInline() {
    const trimmed = deps.createName.value.trim();
    if (!trimmed) {
      deps.error.value = deps.t("profiles.name_required");
      return;
    }
    if (hasDuplicateName(deps.profiles.value, trimmed)) {
      deps.error.value = deps.t("profiles.name_exists");
      return;
    }
    deps.isCreating.value = true;
    deps.error.value = null;
    try {
      await createProfileWithContext(trimmed);
      deps.createName.value = "";
      deps.createOpen.value = false;
      await deps.router.push("/");
      closePanel();
    } catch (err) {
      deps.error.value = toWorkspaceError(deps.t, err);
    } finally {
      deps.isCreating.value = false;
    }
  }

  async function selectProfile(profileId: string) {
    if (
      profileId === deps.activeProfileId.value ||
      deps.switchingId.value ||
      deps.editingId.value
    ) {
      return;
    }
    deps.switchingId.value = profileId;
    deps.error.value = null;
    try {
      await switchProfileWithContext(profileId);
      await deps.router.push("/");
      closePanel();
    } catch (err) {
      deps.error.value = toWorkspaceError(deps.t, err);
    } finally {
      deps.switchingId.value = null;
    }
  }

  async function confirmDelete() {
    if (!deps.deleteTarget.value) {
      return;
    }
    const target = deps.deleteTarget.value;
    deps.deletingId.value = target.id;
    deps.error.value = null;
    try {
      await deleteProfileWithContext(target.id);
      deps.deleteTarget.value = null;
      deps.editingId.value = null;
      await deps.router.push("/");
    } catch (err) {
      deps.error.value = toWorkspaceError(deps.t, err);
    } finally {
      deps.deletingId.value = null;
    }
  }

  return {
    createProfileInline,
    selectProfile,
    confirmDelete,
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
  const renameDeleteActions = createRenameAndDeleteActions(deps);
  const panelActions = createPanelActions(deps, renameDeleteActions.confirmRename);
  const profileActions = createProfileActions(deps, panelActions.closePanel);
  const rowActions = createRowActions(deps, profileActions.selectProfile);
  setupWorkspaceSwitcherEffects(deps);

  return {
    closePanel: panelActions.closePanel,
    onPopoverOpenChange: panelActions.onPopoverOpenChange,
    toggleCreate: panelActions.toggleCreate,
    createProfileInline: profileActions.createProfileInline,
    selectProfile: profileActions.selectProfile,
    confirmRename: renameDeleteActions.confirmRename,
    onPanelMouseDownCapture: renameDeleteActions.onPanelMouseDownCapture,
    onRenameEditorFocusOut: renameDeleteActions.onRenameEditorFocusOut,
    rowMenuItems: renameDeleteActions.rowMenuItems,
    cancelDelete: renameDeleteActions.cancelDelete,
    confirmDelete: profileActions.confirmDelete,
    onProfileRowActivate: rowActions.onProfileRowActivate,
  };
}
