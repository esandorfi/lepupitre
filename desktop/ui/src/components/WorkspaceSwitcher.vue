<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import ConfirmDialog from "./ConfirmDialog.vue";
import { useI18n } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import {
  applyWorkspaceToolbarColor,
  cycleWorkspaceToolbarColor,
  getWorkspaceToolbarColor,
  getWorkspaceToolbarColorPreview,
} from "../lib/workspaceToolbarColor";
import { appStore } from "../stores/app";

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
const openMenuId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const renameValue = ref("");
const renameOriginal = ref("");
const isRenaming = ref(false);
const deletingId = ref<string | null>(null);
const deleteTarget = ref<{ id: string; name: string } | null>(null);
const toolbarColorTick = ref(0);
const openMenuPosition = ref<{ top: number; left: number } | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLDivElement | null>(null);
const menuOverlayRef = ref<HTMLDivElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const createInputRef = ref<HTMLInputElement | null>(null);
const renameInputRef = ref<HTMLInputElement | null>(null);

const profiles = computed(() => appStore.state.profiles);
const activeProfileId = computed(() => appStore.state.activeProfileId);
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

const recentProfileIds = computed(() => new Set(recentProfiles.value.map((profile) => profile.id)));
const showRecentSection = computed(() => recentProfiles.value.length > 0 && filteredProfiles.value.length > 4);
const mainProfiles = computed(() => {
  if (!showRecentSection.value) {
    return filteredProfiles.value;
  }
  return filteredProfiles.value.filter((profile) => !recentProfileIds.value.has(profile.id));
});
const hasNoProfiles = computed(() => profiles.value.length === 0);
const hasNoSearchResults = computed(() => !hasNoProfiles.value && filteredProfiles.value.length === 0);

const currentLabel = computed(() => {
  if (activeProfile.value) {
    return activeProfile.value.name;
  }
  if (appStore.state.isBootstrapping) {
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

const openMenuProfile = computed(
  () => profiles.value.find((profile) => profile.id === openMenuId.value) ?? null
);

const currentToolbarColorStyle = computed(() => {
  void toolbarColorTick.value;
  return toolbarColorPreviewStyle(activeProfileId.value);
});

function hasDuplicateName(nextName: string, exceptId?: string) {
  return profiles.value.some(
    (profile) =>
      profile.id !== exceptId && profile.name.trim().toLowerCase() === nextName.trim().toLowerCase()
  );
}

function closePanel() {
  open.value = false;
  error.value = null;
  search.value = "";
  createOpen.value = false;
  createName.value = "";
  openMenuId.value = null;
  openMenuPosition.value = null;
  editingId.value = null;
  renameValue.value = "";
  renameOriginal.value = "";
  nextTick(() => {
    triggerRef.value?.focus();
  });
}

function togglePanel() {
  open.value = !open.value;
}

async function toggleCreate() {
  createOpen.value = !createOpen.value;
  error.value = null;
  openMenuId.value = null;
  openMenuPosition.value = null;
  if (!createOpen.value) {
    createName.value = "";
    return;
  }
  editingId.value = null;
  await nextTick();
  createInputRef.value?.focus();
  createInputRef.value?.select();
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
    await appStore.createProfile(trimmed);
    createName.value = "";
    createOpen.value = false;
    await router.push("/");
    closePanel();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    isCreating.value = false;
  }
}

async function selectProfile(profileId: string) {
  if (profileId === activeProfileId.value || switchingId.value || editingId.value) {
    return;
  }
  openMenuId.value = null;
  openMenuPosition.value = null;
  switchingId.value = profileId;
  error.value = null;
  try {
    await appStore.switchProfile(profileId);
    await router.push("/");
    closePanel();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    switchingId.value = null;
  }
}

function startRename(profileId: string, currentName: string) {
  openMenuId.value = null;
  openMenuPosition.value = null;
  editingId.value = profileId;
  renameValue.value = currentName;
  renameOriginal.value = currentName;
  createOpen.value = false;
  error.value = null;
  void nextTick(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
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
  // Exit edit mode immediately; save (or validation error) happens afterward.
  cancelRename();
  if (hasDuplicateName(nextName, profileId)) {
    error.value = t("profiles.name_exists");
    return;
  }
  isRenaming.value = true;
  error.value = null;
  try {
    await appStore.renameProfile(profileId, nextName);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
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
  if (renameInputRef.value?.contains(target)) {
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
  openMenuId.value = null;
  openMenuPosition.value = null;
  deleteTarget.value = { id: profileId, name: profileName };
  error.value = null;
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
    await appStore.deleteProfile(target.id);
    deleteTarget.value = null;
    editingId.value = null;
    await router.push("/");
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    deletingId.value = null;
  }
}

function cycleToolbarColor(profileId: string) {
  openMenuId.value = null;
  openMenuPosition.value = null;
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

function toggleRowMenu(profileId: string, event?: MouseEvent) {
  if (openMenuId.value === profileId) {
    openMenuId.value = null;
    openMenuPosition.value = null;
    return;
  }
  openMenuId.value = profileId;
  const target = event?.currentTarget;
  if (!(target instanceof HTMLElement)) {
    openMenuPosition.value = null;
    return;
  }
  const rect = target.getBoundingClientRect();
  const menuWidth = 160;
  const gap = 6;
  const viewportPadding = 8;
  let left = rect.left - menuWidth - gap;
  if (left < viewportPadding) {
    left = Math.min(window.innerWidth - menuWidth - viewportPadding, rect.right + gap);
  }
  const estimatedHeight = 92;
  const top = Math.min(
    Math.max(viewportPadding, rect.top),
    Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding)
  );
  openMenuPosition.value = { top, left };
}

function rowMenuButtonAriaLabel(profileName: string) {
  return `${t("shell.workspaces_more_actions")} ${profileName}`;
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

function onDocumentMouseDown(event: MouseEvent) {
  if (!open.value) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (editingId.value && !renameInputRef.value?.contains(target)) {
    void confirmRename(editingId.value);
  }
  if (
    panelRef.value?.contains(target) ||
    triggerRef.value?.contains(target) ||
    menuOverlayRef.value?.contains(target)
  ) {
    return;
  }
  closePanel();
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (!open.value) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closePanel();
  }
}

watch(open, async (nextOpen) => {
  if (nextOpen) {
    await nextTick();
    if (showSearch.value) {
      searchInputRef.value?.focus();
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

if (typeof document !== "undefined") {
  document.addEventListener("mousedown", onDocumentMouseDown);
  document.addEventListener("keydown", onDocumentKeydown);
}

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("mousedown", onDocumentMouseDown);
    document.removeEventListener("keydown", onDocumentKeydown);
  }
});
</script>

<template>
  <div class="relative">
    <button
      ref="triggerRef"
      class="app-toolbar-button app-focus-ring flex min-h-11 max-w-[260px] cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-left text-xs transition"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="t('shell.workspaces_toggle')"
      @click="togglePanel"
    >
      <span class="inline-flex h-3 w-3 shrink-0 rounded-full border app-border" :style="currentToolbarColorStyle"></span>
      <span class="min-w-0 flex-1 truncate font-semibold">{{ currentLabel }}</span>
      <svg
        class="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div
      v-if="open"
      ref="panelRef"
      class="app-menu-panel absolute top-[calc(100%+0.5rem)] right-0 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border p-3 shadow-xl"
      role="menu"
      @pointerdown.capture="onPanelMouseDownCapture"
    >
      <div class="mb-2 flex items-center justify-between gap-2">
        <h2 class="app-text text-sm font-semibold">{{ t("shell.workspaces_switch_title") }}</h2>
        <button
          class="app-menu-item app-focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border app-border"
          type="button"
          :aria-label="t('shell.close')"
          @click="closePanel"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m18 6-12 12M6 6l12 12" />
          </svg>
        </button>
      </div>
      <input
        v-if="showSearch"
        ref="searchInputRef"
        v-model="search"
        type="text"
        class="app-input app-focus-ring mb-3 h-11 w-full rounded-xl border px-3 text-sm"
        :placeholder="t('shell.workspaces_search')"
      />

      <div v-if="!hasNoProfiles && !hasNoSearchResults" class="max-h-72 space-y-3 overflow-y-auto overflow-x-visible pr-1">
        <div v-if="showRecentSection" class="space-y-1">
          <p class="app-subtle px-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
            {{ t("shell.workspaces_recent") }}
          </p>
          <button
            v-for="profile in recentProfiles"
            :key="`recent-${profile.id}`"
            class="app-switcher-row app-focus-ring flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left"
            type="button"
            :disabled="switchingId === profile.id"
            @click="selectProfile(profile.id)"
          >
            <span class="min-w-0 flex-1">
              <span class="app-text block truncate text-sm font-semibold">{{ profile.name }}</span>
              <span class="app-muted block text-xs">{{ Math.round(profile.size_bytes / 1024) }} KB</span>
            </span>
            <span v-if="switchingId === profile.id" class="app-muted shrink-0 text-xs">…</span>
          </button>
        </div>

        <div class="space-y-1">
          <p v-if="showRecentSection" class="app-subtle px-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
            {{ t("shell.workspaces_all") }}
          </p>
          <div v-for="profile in mainProfiles" :key="profile.id" class="space-y-1">
            <div class="flex items-center gap-1">
            <div
              v-if="editingId === profile.id"
              class="flex min-w-0 flex-1 items-center"
              @focusout="onRenameEditorFocusOut(profile.id, $event)"
            >
              <input
                ref="renameInputRef"
                v-model="renameValue"
                class="app-input app-focus-ring h-9 min-w-0 w-full flex-1 rounded-lg border px-3 text-sm"
                type="text"
                :disabled="isRenaming"
                @keyup.enter="confirmRename(profile.id)"
              />
            </div>

            <button
              v-else
              class="app-switcher-row app-focus-ring group flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left"
              :class="profile.id === activeProfileId ? 'app-switcher-row-active' : ''"
              type="button"
              :disabled="switchingId === profile.id || deletingId === profile.id"
              :title="profile.id === activeProfileId ? t('shell.workspaces_color_cycle') : undefined"
              :style="activeRowStyle(profile.id)"
              @click="onProfileRowActivate(profile.id)"
            >
              <span class="min-w-0 flex-1">
                <span class="app-switcher-row-title block truncate text-sm font-semibold">{{ profile.name }}</span>
                <span class="app-switcher-row-meta block text-xs">{{ Math.round(profile.size_bytes / 1024) }} KB</span>
              </span>
              <span
                v-if="profile.id === activeProfileId"
                class="app-switcher-row-color-indicator shrink-0 rounded-full border transition duration-150 group-hover:scale-110"
                :style="toolbarColorPreviewStyle(profile.id)"
                aria-hidden="true"
              ></span>
              <svg
                v-if="profile.id === activeProfileId"
                class="app-switcher-row-check h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span v-else-if="switchingId === profile.id" class="app-muted shrink-0 text-xs">…</span>
            </button>

            <div v-if="editingId !== profile.id" class="flex shrink-0 items-center gap-1">
              <div class="relative">
                <button
                  class="app-menu-item app-focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border app-border"
                  type="button"
                  :aria-label="rowMenuButtonAriaLabel(profile.name)"
                  :aria-expanded="openMenuId === profile.id ? 'true' : 'false'"
                  aria-haspopup="menu"
                  :disabled="deletingId === profile.id || isRenaming"
                  @click.stop="toggleRowMenu(profile.id, $event)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
      <p v-else-if="hasNoProfiles" class="app-muted py-2 text-sm">{{ t("shell.workspaces_empty") }}</p>
      <p v-else class="app-muted py-2 text-sm">{{ t("shell.workspaces_empty_search") }}</p>

      <p v-if="error" class="app-danger-text mt-2 text-xs">{{ error }}</p>

      <div class="app-divider my-3"></div>
      <div class="grid gap-2">
        <button
          class="app-button-secondary app-focus-ring min-h-11 cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-semibold"
          type="button"
          @click="toggleCreate"
        >
          + {{ t("shell.workspaces_new") }}
        </button>
        <div v-if="createOpen" class="app-card rounded-xl border p-2">
          <input
            ref="createInputRef"
            v-model="createName"
            type="text"
            class="app-input app-focus-ring h-10 w-full rounded-lg border px-3 text-sm"
            :placeholder="t('profiles.create_placeholder')"
            :disabled="isCreating"
            @keyup.enter="createProfileInline"
            @keyup.escape="toggleCreate"
          />
          <div class="mt-2 flex justify-end gap-2">
            <button
              class="app-button-secondary app-focus-ring cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold"
              type="button"
              :disabled="isCreating"
              @click="toggleCreate"
            >
              {{ t("profiles.cancel") }}
            </button>
            <button
              class="app-button-primary app-focus-ring cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold"
              type="button"
              :disabled="isCreating"
              @click="createProfileInline"
            >
              {{ t("profiles.create_action") }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <ConfirmDialog
      :open="deleteTarget !== null"
      :title="deleteDialogTitle"
      :body="deleteDialogBody"
      :confirm-label="t('profiles.confirm_delete_action')"
      :cancel-label="t('profiles.cancel')"
      confirm-variant="danger"
      :busy="Boolean(deleteTarget && deletingId === deleteTarget.id)"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    />
    <Teleport to="body">
      <div
        v-if="open && openMenuId && openMenuProfile && openMenuPosition && editingId !== openMenuId"
        ref="menuOverlayRef"
        class="app-menu-panel fixed z-[70] w-40 rounded-xl border p-1 shadow-lg"
        :style="{ top: `${openMenuPosition.top}px`, left: `${openMenuPosition.left}px` }"
        role="menu"
      >
        <button
          class="app-menu-item app-focus-ring flex min-h-10 w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm"
          type="button"
          @click.stop="startRename(openMenuProfile.id, openMenuProfile.name)"
        >
          {{ t("profiles.rename") }}
        </button>
        <button
          class="app-menu-item app-focus-ring app-danger-text flex min-h-10 w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm"
          type="button"
          @click.stop="requestDelete(openMenuProfile.id, openMenuProfile.name)"
        >
          {{ t("profiles.delete") }}
        </button>
      </div>
    </Teleport>
  </div>
</template>
