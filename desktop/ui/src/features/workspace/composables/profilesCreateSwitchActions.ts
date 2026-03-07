import { nextTick, type Ref } from "vue";
import { workspaceStore } from "@/stores/app";
import {
  hasDuplicateName,
  resolveInputElement,
  toLocalizedError,
  type InputRefTarget,
  type ProfilesState,
  type Translate,
} from "@/features/workspace/composables/profilesPageHelpers";

type ProfilesCreateSwitchArgs = {
  t: Translate;
  state: ProfilesState;
  createInput: Ref<InputRefTarget>;
  createSection: Ref<HTMLElement | null>;
  activeProfileId: Ref<string | null | undefined>;
  pushHome: () => Promise<void>;
};

export function createProfilesCreateSwitchActions(args: ProfilesCreateSwitchArgs) {
  const { t, state, createInput, createSection, activeProfileId, pushHome } = args;

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

  return {
    focusCreateForm,
    createProfile,
    switchProfile,
  };
}
