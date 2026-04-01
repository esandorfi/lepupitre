import {
  computed,
  nextTick,
  onMounted,
  ref,
  watch,
  type ComponentPublicInstance,
  type Ref,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import type { ProfileSummary } from "@/schemas/ipc";
import { appState, sessionStore, workspaceStore } from "@/stores/app";
import {
  hasDuplicateName,
  formatProfileMeta,
  initialsFor,
  resolveInputElement,
  toLocalizedError,
  type InputRefTarget,
  type Translate,
} from "@/features/workspace/composables/profilesPageHelpers";
import { createProfilesCommands } from "@/features/workspace/composables/profilesCommands";
import { createProfilesViewModel } from "@/features/workspace/composables/profilesViewModel";

type ProfilesPageControllerLifecycleArgs = {
  createQuery: Ref<unknown>;
  error: Ref<string | null>;
  focusCreateForm: () => Promise<void>;
  t: Translate;
  deps?: {
    ensureBootstrapped: () => Promise<void>;
    toLocalizedError: typeof toLocalizedError;
  };
};

function createRenameInputRegistry() {
  const renameInputs = new Map<string, InputRefTarget>();

  const setRenameInput =
    (profileId: string) =>
    (el: Element | ComponentPublicInstance | null, _refs?: Record<string, unknown>) => {
      void _refs;
      if (!el) {
        renameInputs.delete(profileId);
        return;
      }
      renameInputs.set(profileId, el as InputRefTarget);
    };

  function focusRenameInput(profileId: string) {
    const input = resolveInputElement(renameInputs.get(profileId) ?? null);
    input?.focus();
    input?.select();
  }

  return { setRenameInput, focusRenameInput };
}

/**
 * Binds bootstrap and route-query focus behavior for the profiles page controller.
 */
export function bindProfilesPageControllerLifecycle(args: ProfilesPageControllerLifecycleArgs) {
  const deps = args.deps ?? {
    ensureBootstrapped: () => sessionStore.ensureBootstrapped(),
    toLocalizedError,
  };

  async function maybeFocusCreateForm() {
    if (!args.createQuery.value) {
      return;
    }
    await args.focusCreateForm();
  }

  watch(
    () => args.createQuery.value,
    () => {
      void maybeFocusCreateForm();
    }
  );

  onMounted(async () => {
    try {
      await deps.ensureBootstrapped();
    } catch (err) {
      args.error.value = deps.toLocalizedError(args.t, err);
    }
    await maybeFocusCreateForm();
  });
}

/**
 * Provides the profiles page controller with flat page-facing state and commands.
 */
export function useProfilesPageController(t: Translate) {
  const router = useRouter();
  const route = useRoute();
  const createSection = ref<HTMLElement | null>(null);
  const createInput = ref<InputRefTarget>(null);
  const name = ref("");
  const error = ref<string | null>(null);
  const isSaving = ref(false);
  const isRenaming = ref(false);
  const deletingId = ref<string | null>(null);
  const editingId = ref<string | null>(null);
  const renameValue = ref("");
  const renameOriginal = ref("");
  const deleteTarget = ref<ProfileSummary | null>(null);
  const profiles = computed(() => appState.profiles);
  const activeProfileId = computed(() => appState.activeProfileId);
  const routeName = computed(() => route.name);
  const createQuery = computed(() => route.query.create);
  const { setRenameInput, focusRenameInput } = createRenameInputRegistry();

  const commands = createProfilesCommands({
    state: {
      routeName,
      profiles,
      activeProfileId,
      name,
      error,
      isSaving,
      isRenaming,
      deletingId,
      editingId,
      renameValue,
      renameOriginal,
      deleteTarget,
    },
    refs: {
      createInput,
      createSection,
      focusRenameInput,
    },
    deps: {
      t,
      nextTick,
      resolveInputElement,
      hasDuplicateName,
      createProfile: (nameValue) => workspaceStore.createProfile(nameValue),
      switchProfile: (profileId) => workspaceStore.switchProfile(profileId),
      renameProfile: (profileId, nextName) => workspaceStore.renameProfile(profileId, nextName),
      deleteProfile: (profileId) => workspaceStore.deleteProfile(profileId),
      toLocalizedError,
      pushHome: async () => {
        await router.push("/");
      },
    },
  });

  const view = createProfilesViewModel({
    t,
    deleteTarget,
    isRenaming,
    deletingId,
    startRename: commands.startRename,
    requestDelete: commands.requestDelete,
  });

  bindProfilesPageControllerLifecycle({
    createQuery,
    error,
    focusCreateForm: commands.focusCreateForm,
    t,
  });

  return {
    name,
    error,
    isSaving,
    isRenaming,
    deletingId,
    editingId,
    renameValue,
    deleteTarget,
    createSection,
    createInput,
    setRenameInput,
    profiles,
    activeProfileId,
    deleteDialogTitle: view.deleteDialogTitle,
    deleteDialogBody: view.deleteDialogBody,
    profileMenuItems: view.profileMenuItems,
    formatProfileMeta,
    initialsFor,
    focusCreateForm: commands.focusCreateForm,
    createProfile: commands.createProfile,
    switchProfile: commands.switchProfile,
    startRename: commands.startRename,
    confirmRename: commands.confirmRename,
    cancelRename: commands.cancelRename,
    requestDelete: commands.requestDelete,
    cancelDelete: commands.cancelDelete,
    confirmDelete: commands.confirmDelete,
  };
}
