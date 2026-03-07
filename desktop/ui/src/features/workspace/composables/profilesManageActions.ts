import { nextTick } from "vue";
import type { ProfileSummary } from "@/schemas/ipc";
import { workspaceStore } from "@/stores/app";
import {
  hasDuplicateName,
  toLocalizedError,
  type ProfilesState,
  type Translate,
} from "@/features/workspace/composables/profilesPageHelpers";

export type ProfilesManageState = {
  identity: {
    routeName: { value: string | symbol | null | undefined };
  };
  model: {
    renameValue: ProfilesState["renameValue"];
    renameOriginal: ProfilesState["renameOriginal"];
    deleteTarget: ProfilesState["deleteTarget"];
  };
  ui: {
    error: ProfilesState["error"];
    isRenaming: ProfilesState["isRenaming"];
    deletingId: ProfilesState["deletingId"];
    editingId: ProfilesState["editingId"];
  };
};

export type ProfilesManageDeps = {
  t: Translate;
  nextTick: typeof nextTick;
  focusRenameInput: (profileId: string) => void;
  hasDuplicateName: typeof hasDuplicateName;
  renameProfile: (profileId: string, name: string) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  toLocalizedError: typeof toLocalizedError;
  pushHome: () => Promise<void>;
};

function createDefaultProfilesManageDeps(
  t: Translate,
  focusRenameInput: (profileId: string) => void,
  pushHome: () => Promise<void>
): ProfilesManageDeps {
  return {
    t,
    nextTick,
    focusRenameInput,
    hasDuplicateName,
    renameProfile: (profileId, name) => workspaceStore.renameProfile(profileId, name),
    deleteProfile: (profileId) => workspaceStore.deleteProfile(profileId),
    toLocalizedError,
    pushHome,
  };
}

type ProfilesManageArgs = {
  state: ProfilesManageState;
  t: Translate;
  focusRenameInput: (profileId: string) => void;
  pushHome: () => Promise<void>;
  deps?: ProfilesManageDeps;
};

export function createProfilesManageActions(args: ProfilesManageArgs) {
  const deps = args.deps ?? createDefaultProfilesManageDeps(args.t, args.focusRenameInput, args.pushHome);
  const { identity, model, ui } = args.state;

  function startRename(profileId: string, currentName: string) {
    ui.editingId.value = profileId;
    model.renameValue.value = currentName;
    model.renameOriginal.value = currentName;
    deps.nextTick(() => {
      deps.focusRenameInput(profileId);
    });
  }

  function cancelRename() {
    ui.editingId.value = null;
    model.renameValue.value = "";
    model.renameOriginal.value = "";
  }

  async function confirmRename(profileId: string) {
    const nextName = model.renameValue.value.trim();
    const originalTrimmed = model.renameOriginal.value.trim();
    if (!nextName || nextName === originalTrimmed) {
      cancelRename();
      return;
    }
    if (deps.hasDuplicateName(nextName, profileId)) {
      ui.error.value = deps.t("profiles.name_exists");
      return;
    }

    ui.isRenaming.value = true;
    ui.error.value = null;
    try {
      await deps.renameProfile(profileId, nextName);
      cancelRename();
    } catch (err) {
      ui.error.value = deps.toLocalizedError(deps.t, err);
    } finally {
      ui.isRenaming.value = false;
    }
  }

  function requestDelete(profile: ProfileSummary) {
    model.deleteTarget.value = profile;
  }

  function profileMenuItems(profile: ProfileSummary) {
    return [
      {
        label: deps.t("profiles.rename"),
        disabled: ui.isRenaming.value,
        onSelect: () => startRename(profile.id, profile.name),
      },
      {
        label: deps.t("profiles.delete"),
        color: "error" as const,
        disabled: ui.deletingId.value === profile.id,
        onSelect: () => requestDelete(profile),
      },
    ];
  }

  function cancelDelete() {
    model.deleteTarget.value = null;
  }

  async function confirmDelete() {
    if (!model.deleteTarget.value) {
      return;
    }
    const target = model.deleteTarget.value;
    ui.deletingId.value = target.id;
    ui.error.value = null;
    try {
      await deps.deleteProfile(target.id);
      model.deleteTarget.value = null;
      if (identity.routeName.value === "profiles") {
        await deps.pushHome();
      }
    } catch (err) {
      ui.error.value = `${target.name}: ${deps.toLocalizedError(deps.t, err)}`;
    } finally {
      ui.deletingId.value = null;
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
