import { nextTick } from "vue";
import type { ProfileSummary } from "@/schemas/ipc";
import { workspaceStore } from "@/stores/app";
import {
  hasDuplicateName,
  toLocalizedError,
  type ProfilesState,
  type Translate,
} from "@/features/workspace/composables/profilesPageHelpers";

type ProfilesManageArgs = {
  t: Translate;
  state: ProfilesState;
  routeName: string | symbol | null | undefined;
  focusRenameInput: (profileId: string) => void;
  pushHome: () => Promise<void>;
};

export function createProfilesManageActions(args: ProfilesManageArgs) {
  const { t, state, routeName, focusRenameInput, pushHome } = args;

  function startRename(profileId: string, currentName: string) {
    state.editingId.value = profileId;
    state.renameValue.value = currentName;
    state.renameOriginal.value = currentName;
    nextTick(() => {
      focusRenameInput(profileId);
    });
  }

  function cancelRename() {
    state.editingId.value = null;
    state.renameValue.value = "";
    state.renameOriginal.value = "";
  }

  async function confirmRename(profileId: string) {
    const nextName = state.renameValue.value.trim();
    const originalTrimmed = state.renameOriginal.value.trim();
    if (!nextName || nextName === originalTrimmed) {
      cancelRename();
      return;
    }
    if (hasDuplicateName(nextName, profileId)) {
      state.error.value = t("profiles.name_exists");
      return;
    }

    state.isRenaming.value = true;
    state.error.value = null;
    try {
      await workspaceStore.renameProfile(profileId, nextName);
      cancelRename();
    } catch (err) {
      state.error.value = toLocalizedError(t, err);
    } finally {
      state.isRenaming.value = false;
    }
  }

  function requestDelete(profile: ProfileSummary) {
    state.deleteTarget.value = profile;
  }

  function profileMenuItems(profile: ProfileSummary) {
    return [
      {
        label: t("profiles.rename"),
        disabled: state.isRenaming.value,
        onSelect: () => startRename(profile.id, profile.name),
      },
      {
        label: t("profiles.delete"),
        color: "error" as const,
        disabled: state.deletingId.value === profile.id,
        onSelect: () => requestDelete(profile),
      },
    ];
  }

  function cancelDelete() {
    state.deleteTarget.value = null;
  }

  async function confirmDelete() {
    if (!state.deleteTarget.value) {
      return;
    }
    const target = state.deleteTarget.value;
    state.deletingId.value = target.id;
    state.error.value = null;
    try {
      await workspaceStore.deleteProfile(target.id);
      state.deleteTarget.value = null;
      if (routeName === "profiles") {
        await pushHome();
      }
    } catch (err) {
      state.error.value = `${target.name}: ${toLocalizedError(t, err)}`;
    } finally {
      state.deletingId.value = null;
    }
  }

  return {
    confirmRename,
    cancelRename,
    profileMenuItems,
    cancelDelete,
    confirmDelete,
  };
}
