import { nextTick, onMounted, watch, type Ref } from "vue";
import type { ProfileSummary } from "@/schemas/ipc";
import { sessionStore, workspaceStore } from "@/stores/app";
import {
  hasDuplicateName,
  resolveInputElement,
  toLocalizedError,
  type InputRefTarget,
  type ProfilesState,
  type Translate,
} from "@/features/workspace/composables/profilesPageHelpers";

type ProfilesActionsArgs = {
  t: Translate;
  routeName: Ref<string | symbol | null | undefined>;
  state: ProfilesState;
  createInput: Ref<InputRefTarget>;
  createSection: Ref<HTMLElement | null>;
  activeProfileId: Ref<string | null | undefined>;
  focusRenameInput: (profileId: string) => void;
  pushHome: () => Promise<void>;
};

export function createProfilesActions(args: ProfilesActionsArgs) {
  const {
    t,
    routeName,
    state,
    createInput,
    createSection,
    activeProfileId,
    focusRenameInput,
    pushHome,
  } = args;

  async function focusCreateForm() {
    await nextTick();
    createSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    const input = resolveInputElement(createInput.value);
    input?.focus();
    input?.select();
  }

  async function createProfile() {
    const trimmed = state.name.value.trim();
    if (!trimmed) {
      state.error.value = t("profiles.name_required");
      return;
    }
    if (hasDuplicateName(trimmed)) {
      state.error.value = t("profiles.name_exists");
      return;
    }

    state.isSaving.value = true;
    state.error.value = null;
    try {
      await workspaceStore.createProfile(trimmed);
      state.name.value = "";
      await pushHome();
    } catch (err) {
      state.error.value = toLocalizedError(t, err);
    } finally {
      state.isSaving.value = false;
    }
  }

  async function switchProfile(profileId: string) {
    if (profileId === activeProfileId.value) {
      return;
    }
    state.error.value = null;
    try {
      await workspaceStore.switchProfile(profileId);
      await pushHome();
    } catch (err) {
      state.error.value = toLocalizedError(t, err);
    }
  }

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
      if (routeName.value === "profiles") {
        await pushHome();
      }
    } catch (err) {
      state.error.value = `${target.name}: ${toLocalizedError(t, err)}`;
    } finally {
      state.deletingId.value = null;
    }
  }

  return {
    focusCreateForm,
    createProfile,
    switchProfile,
    confirmRename,
    cancelRename,
    profileMenuItems,
    cancelDelete,
    confirmDelete,
  };
}

type LifecycleArgs = {
  t: Translate;
  createQuery: Ref<unknown>;
  focusCreateForm: () => Promise<void>;
  setError: (message: string) => void;
};

export function bindProfilesLifecycle(args: LifecycleArgs) {
  const { t, createQuery, focusCreateForm, setError } = args;

  async function maybeFocusCreateFromRoute() {
    if (!createQuery.value) {
      return;
    }
    await focusCreateForm();
  }

  watch(
    () => createQuery.value,
    () => {
      void maybeFocusCreateFromRoute();
    }
  );

  onMounted(async () => {
    try {
      await sessionStore.ensureBootstrapped();
    } catch (err) {
      setError(toLocalizedError(t, err));
    }
    await maybeFocusCreateFromRoute();
  });
}
