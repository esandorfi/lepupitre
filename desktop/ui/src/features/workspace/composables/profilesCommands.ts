import { nextTick, type Ref } from "vue";
import type { ProfileSummary } from "@/schemas/ipc";
import {
  hasDuplicateName,
  resolveInputElement,
  toLocalizedError,
  type InputRefTarget,
  type Translate,
} from "@/features/workspace/composables/profilesPageHelpers";

export type ProfilesCommandState = {
  routeName: Ref<string | symbol | null | undefined>;
  profiles: Ref<ProfileSummary[]>;
  activeProfileId: Ref<string | null | undefined>;
  name: Ref<string>;
  error: Ref<string | null>;
  isSaving: Ref<boolean>;
  isRenaming: Ref<boolean>;
  deletingId: Ref<string | null>;
  editingId: Ref<string | null>;
  renameValue: Ref<string>;
  renameOriginal: Ref<string>;
  deleteTarget: Ref<ProfileSummary | null>;
};

export type ProfilesCommandRefs = {
  createInput: Ref<InputRefTarget>;
  createSection: Ref<HTMLElement | null>;
  focusRenameInput: (profileId: string) => void;
};

export type ProfilesCommandDeps = {
  t: Translate;
  nextTick: typeof nextTick;
  resolveInputElement: typeof resolveInputElement;
  hasDuplicateName: typeof hasDuplicateName;
  createProfile: (name: string) => Promise<unknown>;
  switchProfile: (profileId: string) => Promise<void>;
  renameProfile: (profileId: string, name: string) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  toLocalizedError: typeof toLocalizedError;
  pushHome: () => Promise<void>;
};

type ProfilesCommandsArgs = {
  state: ProfilesCommandState;
  refs: ProfilesCommandRefs;
  deps: ProfilesCommandDeps;
};

/**
 * Creates profile page commands for create, switch, rename, and delete flows.
 */
export function createProfilesCommands(args: ProfilesCommandsArgs) {
  const { state, refs, deps } = args;

  async function focusCreateForm() {
    await deps.nextTick();
    refs.createSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    const input = deps.resolveInputElement(refs.createInput.value);
    input?.focus();
    input?.select();
  }

  async function createProfile() {
    const trimmed = state.name.value.trim();
    if (!trimmed) {
      state.error.value = deps.t("profiles.name_required");
      return;
    }
    if (deps.hasDuplicateName(state.profiles.value, trimmed)) {
      state.error.value = deps.t("profiles.name_exists");
      return;
    }

    state.isSaving.value = true;
    state.error.value = null;
    try {
      await deps.createProfile(trimmed);
      state.name.value = "";
      await deps.pushHome();
    } catch (err) {
      state.error.value = deps.toLocalizedError(deps.t, err);
    } finally {
      state.isSaving.value = false;
    }
  }

  async function switchProfile(profileId: string) {
    if (profileId === state.activeProfileId.value) {
      return;
    }
    state.error.value = null;
    try {
      await deps.switchProfile(profileId);
      await deps.pushHome();
    } catch (err) {
      state.error.value = deps.toLocalizedError(deps.t, err);
    }
  }

  function startRename(profileId: string, currentName: string) {
    state.editingId.value = profileId;
    state.renameValue.value = currentName;
    state.renameOriginal.value = currentName;
    void deps.nextTick(() => {
      refs.focusRenameInput(profileId);
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
    if (deps.hasDuplicateName(state.profiles.value, nextName, profileId)) {
      state.error.value = deps.t("profiles.name_exists");
      return;
    }

    state.isRenaming.value = true;
    state.error.value = null;
    try {
      await deps.renameProfile(profileId, nextName);
      cancelRename();
    } catch (err) {
      state.error.value = deps.toLocalizedError(deps.t, err);
    } finally {
      state.isRenaming.value = false;
    }
  }

  function requestDelete(profile: ProfileSummary) {
    state.deleteTarget.value = profile;
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
      await deps.deleteProfile(target.id);
      state.deleteTarget.value = null;
      if (state.routeName.value === "profiles") {
        await deps.pushHome();
      }
    } catch (err) {
      state.error.value = `${target.name}: ${deps.toLocalizedError(deps.t, err)}`;
    } finally {
      state.deletingId.value = null;
    }
  }

  return {
    focusCreateForm,
    createProfile,
    switchProfile,
    startRename,
    cancelRename,
    confirmRename,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
