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

export type ProfilesCreateSwitchState = {
  identity: {
    createInput: Ref<InputRefTarget>;
    createSection: Ref<HTMLElement | null>;
    activeProfileId: Ref<string | null | undefined>;
  };
  model: {
    name: ProfilesState["name"];
  };
  ui: {
    error: ProfilesState["error"];
    isSaving: ProfilesState["isSaving"];
  };
};

export type ProfilesCreateSwitchDeps = {
  t: Translate;
  nextTick: typeof nextTick;
  resolveInputElement: typeof resolveInputElement;
  hasDuplicateName: typeof hasDuplicateName;
  createProfile: (name: string) => Promise<unknown>;
  switchProfile: (profileId: string) => Promise<void>;
  toLocalizedError: typeof toLocalizedError;
  pushHome: () => Promise<void>;
};

function createDefaultProfilesCreateSwitchDeps(
  t: Translate,
  pushHome: () => Promise<void>
): ProfilesCreateSwitchDeps {
  return {
    t,
    nextTick,
    resolveInputElement,
    hasDuplicateName,
    createProfile: (name) => workspaceStore.createProfile(name),
    switchProfile: (profileId) => workspaceStore.switchProfile(profileId),
    toLocalizedError,
    pushHome,
  };
}

type ProfilesCreateSwitchArgs = {
  state: ProfilesCreateSwitchState;
  t: Translate;
  pushHome: () => Promise<void>;
  deps?: ProfilesCreateSwitchDeps;
};

export function createProfilesCreateSwitchActions(args: ProfilesCreateSwitchArgs) {
  const deps = args.deps ?? createDefaultProfilesCreateSwitchDeps(args.t, args.pushHome);
  const { identity, model, ui } = args.state;

  async function focusCreateForm() {
    await deps.nextTick();
    identity.createSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
    const input = deps.resolveInputElement(identity.createInput.value);
    input?.focus();
    input?.select();
  }

  async function createProfile() {
    const trimmed = model.name.value.trim();
    if (!trimmed) {
      ui.error.value = deps.t("profiles.name_required");
      return;
    }
    if (deps.hasDuplicateName(trimmed)) {
      ui.error.value = deps.t("profiles.name_exists");
      return;
    }

    ui.isSaving.value = true;
    ui.error.value = null;
    try {
      await deps.createProfile(trimmed);
      model.name.value = "";
      await deps.pushHome();
    } catch (err) {
      ui.error.value = deps.toLocalizedError(deps.t, err);
    } finally {
      ui.isSaving.value = false;
    }
  }

  async function switchProfile(profileId: string) {
    if (profileId === identity.activeProfileId.value) {
      return;
    }
    ui.error.value = null;
    try {
      await deps.switchProfile(profileId);
      await deps.pushHome();
    } catch (err) {
      ui.error.value = deps.toLocalizedError(deps.t, err);
    }
  }

  return {
    focusCreateForm,
    createProfile,
    switchProfile,
  };
}
