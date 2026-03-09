import { nextTick } from "vue";
import { workspaceStore } from "@/stores/app";
import { resolveInputElement } from "@/components/workspace/workspaceSwitcher.refs";
import {
  hasDuplicateName,
  toWorkspaceError,
  type WorkspaceSwitcherActionDeps,
} from "@/components/workspace/workspaceSwitcherActions.shared";

/**
 * Creates and returns the create workspace rename actions contract.
 */
export function createWorkspaceRenameActions(deps: WorkspaceSwitcherActionDeps) {
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
    confirmRename,
    onPanelMouseDownCapture,
    onRenameEditorFocusOut,
    rowMenuItems,
    cancelDelete,
  };
}
