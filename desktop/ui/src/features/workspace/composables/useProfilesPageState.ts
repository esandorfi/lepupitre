import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { appState } from "@/stores/app";
import {
  createProfilesState,
  createRenameInputs,
  formatProfileMeta,
  initialsFor,
  type InputRefTarget,
} from "@/features/workspace/composables/profilesPageHelpers";
import {
  bindProfilesLifecycle,
  createProfilesActions,
} from "@/features/workspace/composables/profilesPageRuntime";

export function useProfilesPageState() {
  const { t } = useI18n();
  const router = useRouter();
  const route = useRoute();

  const state = createProfilesState();
  const createSection = ref<HTMLElement | null>(null);
  const createInput = ref<InputRefTarget>(null);
  const profiles = computed(() => appState.profiles);
  const activeProfileId = computed(() => appState.activeProfileId);
  const routeName = computed(() => route.name);
  const createQuery = computed(() => route.query.create);

  const { setRenameInput, focusRenameInput } = createRenameInputs();

  const deleteDialogTitle = computed(() => {
    if (!state.deleteTarget.value) {
      return "";
    }
    return `${t("profiles.delete_title_prefix")} "${state.deleteTarget.value.name}" ?`;
  });
  const deleteDialogBody = computed(() => {
    if (!state.deleteTarget.value) {
      return "";
    }
    return `${t("profiles.delete_body_prefix")} "${state.deleteTarget.value.name}" ${t(
      "profiles.delete_body_suffix"
    )}`;
  });

  const actions = createProfilesActions({
    t,
    routeName,
    state,
    createInput,
    createSection,
    activeProfileId,
    focusRenameInput,
    pushHome: async () => {
      await router.push("/");
    },
  });

  bindProfilesLifecycle({
    t,
    createQuery,
    focusCreateForm: actions.focusCreateForm,
    setError: (message) => {
      state.error.value = message;
    },
  });

  return {
    t,
    name: state.name,
    error: state.error,
    isSaving: state.isSaving,
    isRenaming: state.isRenaming,
    deletingId: state.deletingId,
    editingId: state.editingId,
    renameValue: state.renameValue,
    deleteTarget: state.deleteTarget,
    createSection,
    createInput,
    setRenameInput,
    profiles,
    activeProfileId,
    deleteDialogTitle,
    deleteDialogBody,
    formatProfileMeta,
    initialsFor,
    ...actions,
  };
}
