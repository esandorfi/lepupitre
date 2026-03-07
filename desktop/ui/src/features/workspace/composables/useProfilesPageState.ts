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
import { useI18n } from "@/lib/i18n";
import type { ProfileSummary } from "@/schemas/ipc";
import { appState, sessionStore, workspaceStore } from "@/stores/app";

type InputRefTarget =
  | HTMLInputElement
  | ComponentPublicInstance
  | { $el?: Element | null; inputRef?: HTMLInputElement | null }
  | null;

type Translate = (key: string) => string;

type ProfilesState = {
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

function resolveInputElement(target: InputRefTarget): HTMLInputElement | null {
  if (!target) {
    return null;
  }
  if (target instanceof HTMLInputElement) {
    return target;
  }
  if ("inputRef" in target && target.inputRef instanceof HTMLInputElement) {
    return target.inputRef;
  }
  if ("$el" in target && target.$el instanceof HTMLElement) {
    const input = target.$el.querySelector("input");
    if (input instanceof HTMLInputElement) {
      return input;
    }
  }
  return null;
}

function toLocalizedError(t: Translate, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("recording_active")) {
    return t("profiles.switch_blocked_recording");
  }
  return message;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatProfileMeta(profile: { talks_count: number; size_bytes: number }) {
  const talksLabel = profile.talks_count === 1 ? "talk" : "talks";
  return `${profile.talks_count} ${talksLabel} - ${formatBytes(profile.size_bytes)}`;
}

function initialsFor(nameValue: string) {
  const parts = nameValue.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "WS";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function hasDuplicateName(nextName: string, exceptId?: string) {
  return appState.profiles.some(
    (profile) =>
      profile.id !== exceptId && profile.name.trim().toLowerCase() === nextName.trim().toLowerCase()
  );
}

function createProfilesState(): ProfilesState {
  return {
    name: ref(""),
    error: ref<string | null>(null),
    isSaving: ref(false),
    isRenaming: ref(false),
    deletingId: ref<string | null>(null),
    editingId: ref<string | null>(null),
    renameValue: ref(""),
    renameOriginal: ref(""),
    deleteTarget: ref<ProfileSummary | null>(null),
  };
}

function createRenameInputs() {
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

function createProfilesActions(args: ProfilesActionsArgs) {
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

function bindProfilesLifecycle(args: LifecycleArgs) {
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
