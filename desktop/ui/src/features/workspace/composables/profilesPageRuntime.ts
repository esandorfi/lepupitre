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
  state: {
    identity: {
      routeName: Ref<string | symbol | null | undefined>;
      createInput: Ref<InputRefTarget>;
      createSection: Ref<HTMLElement | null>;
      activeProfileId: Ref<string | null | undefined>;
    };
    model: ProfilesState;
  };
  t: Translate;
  focusRenameInput: (profileId: string) => void;
  pushHome: () => Promise<void>;
};

export function createProfilesActions(args: ProfilesActionsArgs) {
  const { state, t, focusRenameInput, pushHome } = args;
  const createSwitchActions = createProfilesCreateSwitchActions({
    t,
    pushHome,
    state: {
      identity: {
        createInput: state.identity.createInput,
        createSection: state.identity.createSection,
        activeProfileId: state.identity.activeProfileId,
      },
      model: {
        name: state.model.name,
      },
      ui: {
        error: state.model.error,
        isSaving: state.model.isSaving,
      },
    },
  });
  const manageActions = createProfilesManageActions({
    t,
    focusRenameInput,
    pushHome,
    state: {
      identity: {
        routeName: state.identity.routeName,
      },
      model: {
        renameValue: state.model.renameValue,
        renameOriginal: state.model.renameOriginal,
        deleteTarget: state.model.deleteTarget,
      },
      ui: {
        error: state.model.error,
        isRenaming: state.model.isRenaming,
        deletingId: state.model.deletingId,
        editingId: state.model.editingId,
      },
    },
  });

  return {
    ...createSwitchActions,
    ...manageActions,
  };
}

type LifecycleArgs = {
  state: {
    identity: {
      createQuery: Ref<unknown>;
    };
    ui: {
      error: ProfilesState["error"];
    };
  };
  deps?: {
    ensureBootstrapped: () => Promise<void>;
    toLocalizedError: typeof toLocalizedError;
    t: Translate;
  };
  t: Translate;
  focusCreateForm: () => Promise<void>;
};

export function bindProfilesLifecycle(args: LifecycleArgs) {
  const deps = args.deps ?? {
    ensureBootstrapped: () => sessionStore.ensureBootstrapped(),
    toLocalizedError,
    t: args.t,
  };
  const { state, focusCreateForm } = args;

  async function maybeFocusCreateFromRoute() {
    if (!state.identity.createQuery.value) {
      return;
    }
    await focusCreateForm();
  }

  watch(
    () => state.identity.createQuery.value,
    () => {
      void maybeFocusCreateFromRoute();
    }
  );

  onMounted(async () => {
    try {
      await deps.ensureBootstrapped();
    } catch (err) {
      state.ui.error.value = deps.toLocalizedError(deps.t, err);
    }
    await maybeFocusCreateFromRoute();
  });
}
