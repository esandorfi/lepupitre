import { onMounted, watch, type Ref } from "vue";
import { sessionStore } from "@/stores/app";
import {
  toLocalizedError,
  type InputRefTarget,
  type ProfilesState,
  type Translate,
} from "@/features/workspace/composables/profilesPageHelpers";
import { createProfilesCreateSwitchActions } from "@/features/workspace/composables/profilesCreateSwitchActions";
import { createProfilesManageActions } from "@/features/workspace/composables/profilesManageActions";

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
  const createSwitchActions = createProfilesCreateSwitchActions({
    t,
    state,
    createInput,
    createSection,
    activeProfileId,
    pushHome,
  });
  const manageActions = createProfilesManageActions({
    t,
    state,
    routeName: routeName.value,
    focusRenameInput,
    pushHome,
  });

  return {
    ...createSwitchActions,
    ...manageActions,
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
