import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import {
  applyWorkspaceToolbarColor,
  cycleWorkspaceToolbarColor,
  getWorkspaceToolbarColor,
  getWorkspaceToolbarColorPreview,
} from "@/lib/workspaceToolbarColor";
import { appState, talksStore, trainingStore, workspaceStore } from "@/stores/app";
type ButtonRefTarget = HTMLButtonElement | { $el?: Element | null } | null;
type InputRefTarget = HTMLInputElement | { $el?: Element | null; inputRef?: HTMLInputElement | null } | null;
export function useWorkspaceSwitcher() {
  const { t } = useI18n();
  const router = useRouter();
  const { theme } = useTheme();
  const open = ref(false);
  const search = ref("");
  const error = ref<string | null>(null);
  const switchingId = ref<string | null>(null);
  const createOpen = ref(false);
  const createName = ref("");
  const isCreating = ref(false);
  const editingId = ref<string | null>(null);
  const renameValue = ref("");
  const renameOriginal = ref("");
  const isRenaming = ref(false);
  const deletingId = ref<string | null>(null);
  const deleteTarget = ref<{ id: string; name: string } | null>(null);
  const toolbarColorTick = ref(0);
  const triggerRef = ref<ButtonRefTarget>(null);
  const searchInputRef = ref<InputRefTarget>(null);
  const createInputRef = ref<InputRefTarget>(null);
  const renameInputRef = ref<InputRefTarget>(null);
  const PANEL_POPOVER_CONTENT = {
    align: "end",
    side: "bottom",
    sideOffset: 8,
  } as const;

  const PANEL_POPOVER_UI = {
    content:
      "z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-[var(--color-text)] shadow-[var(--shadow-md)]",
  } as const;
  const profiles = computed(() => appState.profiles);
  const activeProfileId = computed(() => appState.activeProfileId);
  const activeProfile = computed(
    () => profiles.value.find((profile) => profile.id === activeProfileId.value) ?? null
  );
  function profileSortScore(profile: { last_opened_at?: string | null; created_at: string }) {
    const timestamp = Date.parse(profile.last_opened_at || profile.created_at);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  const sortedProfiles = computed(() =>
    [...profiles.value].sort((a, b) => a.name.localeCompare(b.name))
  );
  const showSearch = computed(() => profiles.value.length > 10);
  const isSearching = computed(() => showSearch.value && search.value.trim().length > 0);

  const filteredProfiles = computed(() => {
    if (!showSearch.value) {
      return sortedProfiles.value;
    }
    const needle = search.value.trim().toLowerCase();
    if (!needle) {
      return sortedProfiles.value;
    }
    return sortedProfiles.value.filter((profile) => profile.name.toLowerCase().includes(needle));
  });

  const recentProfiles = computed(() => {
    if (isSearching.value) {
      return [];
    }
    return [...filteredProfiles.value]
      .filter((profile) => profile.id !== activeProfileId.value && Boolean(profile.last_opened_at))
      .sort((a, b) => profileSortScore(b) - profileSortScore(a))
      .slice(0, 3);
  });

  const recentProfileIds = computed(
    () => new Set(recentProfiles.value.map((profile) => profile.id))
  );
  const showRecentSection = computed(
    () => recentProfiles.value.length > 0 && filteredProfiles.value.length > 4
  );
  const mainProfiles = computed(() => {
    if (!showRecentSection.value) {
      return filteredProfiles.value;
    }
    return filteredProfiles.value.filter((profile) => !recentProfileIds.value.has(profile.id));
  });
  const hasNoProfiles = computed(() => profiles.value.length === 0);
  const hasNoSearchResults = computed(
    () => !hasNoProfiles.value && filteredProfiles.value.length === 0
  );

  const currentLabel = computed(() => {
    if (activeProfile.value) {
      return activeProfile.value.name;
    }
    if (appState.isBootstrapping) {
      return t("shell.workspaces_loading");
    }
    return t("shell.workspaces_none");
  });

  const deleteDialogTitle = computed(() => {
    if (!deleteTarget.value) {
      return "";
    }
    return `${t("profiles.delete_title_prefix")} "${deleteTarget.value.name}" ?`;
  });

  const deleteDialogBody = computed(() => {
    if (!deleteTarget.value) {
      return "";
    }
    return `${t("profiles.delete_body_prefix")} "${deleteTarget.value.name}" ${t(
      "profiles.delete_body_suffix"
    )}`;
  });

  const currentToolbarColorStyle = computed(() => {
    void toolbarColorTick.value;
    return toolbarColorPreviewStyle(activeProfileId.value);
  });

  function resolveInputElement(target: InputRefTarget): HTMLInputElement | null {
    if (!target) {
      return null;
    }
    if (target instanceof HTMLInputElement) {
      return target;
    }
    if (target.inputRef instanceof HTMLInputElement) {
      return target.inputRef;
    }
    if (target.$el instanceof HTMLElement) {
      const input = target.$el.querySelector("input");
      if (input instanceof HTMLInputElement) {
        return input;
      }
    }
    return null;
  }

  function resolveButtonElement(target: ButtonRefTarget): HTMLButtonElement | null {
    if (!target) {
      return null;
    }
    if (target instanceof HTMLButtonElement) {
      return target;
    }
    if (!(target.$el instanceof HTMLElement)) {
      return null;
    }
    if (target.$el instanceof HTMLButtonElement) {
      return target.$el;
    }
    const button = target.$el.querySelector("button");
    if (button instanceof HTMLButtonElement) {
      return button;
    }
    return null;
  }

  function hasDuplicateName(nextName: string, exceptId?: string) {
    return profiles.value.some(
      (profile) =>
        profile.id !== exceptId &&
        profile.name.trim().toLowerCase() === nextName.trim().toLowerCase()
    );
  }

  function toWorkspaceError(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("recording_active")) {
      return t("profiles.switch_blocked_recording");
    }
    return message;
  }

  async function refreshProfileContext() {
    await talksStore.loadActiveProject();
    await talksStore.loadProjects();
    await trainingStore.loadDailyQuest();
  }

  async function createProfileWithContext(name: string) {
    const id = await workspaceStore.createProfile(name);
    await refreshProfileContext();
    return id;
  }

  async function switchProfileWithContext(profileId: string) {
    await workspaceStore.switchProfile(profileId);
    await refreshProfileContext();
  }

  async function deleteProfileWithContext(profileId: string) {
    await workspaceStore.deleteProfile(profileId);
    await refreshProfileContext();
  }

  function closePanel() {
    if (editingId.value) {
      void confirmRename(editingId.value);
    }
    open.value = false;
    error.value = null;
    search.value = "";
    createOpen.value = false;
    createName.value = "";
    editingId.value = null;
    renameValue.value = "";
    renameOriginal.value = "";
    nextTick(() => {
      resolveButtonElement(triggerRef.value)?.focus();
    });
  }

  function onPopoverOpenChange(nextOpen: boolean) {
    if (open.value === nextOpen) {
      return;
    }
    if (!nextOpen && editingId.value) {
      void confirmRename(editingId.value);
    }
    open.value = nextOpen;
    if (nextOpen) {
      return;
    }
    error.value = null;
    search.value = "";
    createOpen.value = false;
    createName.value = "";
    editingId.value = null;
    renameValue.value = "";
    renameOriginal.value = "";
  }

  async function toggleCreate() {
    createOpen.value = !createOpen.value;
    error.value = null;
    if (!createOpen.value) {
      createName.value = "";
      return;
    }
    editingId.value = null;
    await nextTick();
    const input = resolveInputElement(createInputRef.value);
    input?.focus();
    input?.select();
  }

  async function createProfileInline() {
    const trimmed = createName.value.trim();
    if (!trimmed) {
      error.value = t("profiles.name_required");
      return;
    }
    if (hasDuplicateName(trimmed)) {
      error.value = t("profiles.name_exists");
      return;
    }
    isCreating.value = true;
    error.value = null;
    try {
      await createProfileWithContext(trimmed);
      createName.value = "";
      createOpen.value = false;
      await router.push("/");
      closePanel();
    } catch (err) {
      error.value = toWorkspaceError(err);
    } finally {
      isCreating.value = false;
    }
  }

  async function selectProfile(profileId: string) {
    if (profileId === activeProfileId.value || switchingId.value || editingId.value) {
      return;
    }
    switchingId.value = profileId;
    error.value = null;
    try {
      await switchProfileWithContext(profileId);
      await router.push("/");
      closePanel();
    } catch (err) {
      error.value = toWorkspaceError(err);
    } finally {
      switchingId.value = null;
    }
  }

  function startRename(profileId: string, currentName: string) {
    editingId.value = profileId;
    renameValue.value = currentName;
    renameOriginal.value = currentName;
    createOpen.value = false;
    error.value = null;
    void nextTick(() => {
      const input = resolveInputElement(renameInputRef.value);
      input?.focus();
      input?.select();
    });
  }

  function cancelRename() {
    editingId.value = null;
    renameValue.value = "";
    renameOriginal.value = "";
  }

  async function confirmRename(profileId: string) {
    if (editingId.value !== profileId) {
      return;
    }
    const nextName = renameValue.value.trim();
    const originalTrimmed = renameOriginal.value.trim();
    if (!nextName || nextName === originalTrimmed) {
      cancelRename();
      return;
    }
    cancelRename();
    if (hasDuplicateName(nextName, profileId)) {
      error.value = t("profiles.name_exists");
      return;
    }
    isRenaming.value = true;
    error.value = null;
    try {
      await workspaceStore.renameProfile(profileId, nextName);
    } catch (err) {
      error.value = toWorkspaceError(err);
    } finally {
      isRenaming.value = false;
    }
  }

  function onPanelMouseDownCapture(event: MouseEvent) {
    if (!editingId.value) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (resolveInputElement(renameInputRef.value)?.contains(target)) {
      return;
    }
    void confirmRename(editingId.value);
  }

  function onRenameEditorFocusOut(profileId: string, event: FocusEvent) {
    if (editingId.value !== profileId) {
      return;
    }
    const currentTarget = event.currentTarget;
    const nextTarget = event.relatedTarget;
    if (
      currentTarget instanceof HTMLElement &&
      nextTarget instanceof Node &&
      currentTarget.contains(nextTarget)
    ) {
      return;
    }
    void confirmRename(profileId);
  }

  function requestDelete(profileId: string, profileName: string) {
    deleteTarget.value = { id: profileId, name: profileName };
    error.value = null;
  }

  function rowMenuItems(profile: { id: string; name: string }) {
    return [
      {
        label: t("profiles.rename"),
        disabled: isRenaming.value,
        onSelect: () => startRename(profile.id, profile.name),
      },
      {
        label: t("profiles.delete"),
        color: "error" as const,
        disabled: deletingId.value === profile.id,
        onSelect: () => requestDelete(profile.id, profile.name),
      },
    ];
  }

  function cancelDelete() {
    deleteTarget.value = null;
  }

  async function confirmDelete() {
    if (!deleteTarget.value) {
      return;
    }
    const target = deleteTarget.value;
    deletingId.value = target.id;
    error.value = null;
    try {
      await deleteProfileWithContext(target.id);
      deleteTarget.value = null;
      editingId.value = null;
      await router.push("/");
    } catch (err) {
      error.value = toWorkspaceError(err);
    } finally {
      deletingId.value = null;
    }
  }

  function cycleToolbarColor(profileId: string) {
    cycleWorkspaceToolbarColor(profileId);
    toolbarColorTick.value += 1;
    if (profileId === activeProfileId.value) {
      applyWorkspaceToolbarColor(profileId, theme.value);
    }
  }

  function onProfileRowActivate(profileId: string) {
    if (editingId.value || deletingId.value) {
      return;
    }
    if (profileId === activeProfileId.value) {
      cycleToolbarColor(profileId);
      return;
    }
    void selectProfile(profileId);
  }

  function rowMenuButtonAriaLabel(profileName: string) {
    return `${t("shell.workspaces_more_actions")} ${profileName}`;
  }

  function workspaceMetaLabel(profile: { talks_count: number; size_bytes: number }) {
    const talksLabel = profile.talks_count === 1 ? "talk" : "talks";
    return `${profile.talks_count} ${talksLabel} - ${Math.round(profile.size_bytes / 1024)} KB`;
  }

  function toolbarColorPreviewStyle(profileId: string | null | undefined) {
    void toolbarColorTick.value;
    const key = getWorkspaceToolbarColor(profileId);
    const preview = getWorkspaceToolbarColorPreview(key, theme.value);
    return {
      backgroundImage: `linear-gradient(135deg, ${preview.start}, ${preview.end})`,
      borderColor: preview.border,
    } as const;
  }

  function activeRowStyle(profileId: string) {
    if (profileId !== activeProfileId.value) {
      return undefined;
    }
    void toolbarColorTick.value;
    const key = getWorkspaceToolbarColor(profileId);
    const preview = getWorkspaceToolbarColorPreview(key, theme.value);
    return {
      backgroundColor: preview.start,
      backgroundImage: `linear-gradient(135deg, ${preview.start}, ${preview.end})`,
      boxShadow: `inset 0 0 0 1px ${preview.border}`,
      "--app-switcher-active-text": preview.text,
      "--app-switcher-active-muted": preview.muted,
    } as Record<string, string>;
  }

  watch(open, async (nextOpen) => {
    if (nextOpen) {
      await nextTick();
      if (showSearch.value) {
        resolveInputElement(searchInputRef.value)?.focus();
      }
    }
  });

  watch(
    [activeProfileId, theme],
    ([profileId, currentTheme]) => {
      applyWorkspaceToolbarColor(profileId, currentTheme);
    },
    { immediate: true }
  );

  return {
    t,
    open,
    search,
    error,
    switchingId,
    createOpen,
    createName,
    isCreating,
    editingId,
    renameValue,
    isRenaming,
    deletingId,
    deleteTarget,
    triggerRef,
    searchInputRef,
    createInputRef,
    renameInputRef,
    PANEL_POPOVER_CONTENT,
    PANEL_POPOVER_UI,
    activeProfileId,
    recentProfiles,
    showSearch,
    showRecentSection,
    mainProfiles,
    hasNoProfiles,
    hasNoSearchResults,
    currentLabel,
    deleteDialogTitle,
    deleteDialogBody,
    currentToolbarColorStyle,
    closePanel,
    onPopoverOpenChange,
    toggleCreate,
    createProfileInline,
    selectProfile,
    confirmRename,
    onPanelMouseDownCapture,
    onRenameEditorFocusOut,
    rowMenuItems,
    cancelDelete,
    confirmDelete,
    onProfileRowActivate,
    rowMenuButtonAriaLabel,
    workspaceMetaLabel,
    toolbarColorPreviewStyle,
    activeRowStyle,
  };
}
