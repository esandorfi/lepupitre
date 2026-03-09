import {
  createProfileWithContext,
  deleteProfileWithContext,
  hasDuplicateName,
  switchProfileWithContext,
  toWorkspaceError,
  type WorkspaceSwitcherActionDeps,
} from "@/components/workspace/workspaceSwitcherActions.shared";

/**
 * Creates and returns the create workspace profile actions contract.
 */
export function createWorkspaceProfileActions(
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
