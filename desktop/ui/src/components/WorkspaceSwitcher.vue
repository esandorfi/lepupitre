<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import {
  applyWorkspaceToolbarColor,
  cycleWorkspaceToolbarColor,
  getWorkspaceToolbarColor,
  getWorkspaceToolbarColorPreview,
} from "@/lib/workspaceToolbarColor";
import { appStore } from "@/stores/app";

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
type ButtonRefTarget = HTMLButtonElement | { $el?: Element | null } | null;
const triggerRef = ref<ButtonRefTarget>(null);
type InputRefTarget = HTMLInputElement | { $el?: Element | null; inputRef?: HTMLInputElement | null } | null;
const searchInputRef = ref<InputRefTarget>(null);
const createInputRef = ref<InputRefTarget>(null);
const renameInputRef = ref<InputRefTarget>(null);

const PANEL_POPOVER_CONTENT = {
  align: "end",
  side: "bottom",
  sideOffset: 8,
} as const;

const PANEL_POPOVER_UI = {
  content: "app-menu-panel z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border p-3 shadow-xl",
} as const;

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
      profile.id !== exceptId && profile.name.trim().toLowerCase() === nextName.trim().toLowerCase()
  );
}

function toWorkspaceError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("recording_active")) {
    return t("profiles.switch_blocked_recording");
  }
  return message;
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
    await appStore.createProfile(trimmed);
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
    await appStore.switchProfile(profileId);
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
    await appStore.deleteProfile(target.id);
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
  return `${profile.talks_count} ${talksLabel} · ${Math.round(profile.size_bytes / 1024)} KB`;
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
</script>

<template>
  <div class="relative">
    <UPopover
      :open="open"
      :portal="false"
      :content="PANEL_POPOVER_CONTENT"
      :ui="PANEL_POPOVER_UI"
      @update:open="onPopoverOpenChange"
    >
      <template #default="{ open: menuOpen }">
        <AppButton
          ref="triggerRef"
          tone="secondary"
          size="md"
          class="app-toolbar-button flex max-w-[260px] items-center gap-2 border px-3 text-left app-text-meta transition"
          aria-haspopup="menu"
          :aria-expanded="menuOpen ? 'true' : 'false'"
          :aria-label="t('shell.workspaces_toggle')"
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
        </AppButton>
      </template>

      <template #content>
        <div @pointerdown.capture="onPanelMouseDownCapture">
      <div class="mb-2 flex items-center justify-between gap-2">
        <h2 class="app-text text-sm font-semibold">{{ t("shell.workspaces_switch_title") }}</h2>
        <AppButton
          tone="secondary"
          size="icon-md"
          class="border app-border"
          :aria-label="t('shell.close')"
          @click="closePanel"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m18 6-12 12M6 6l12 12" />
          </svg>
        </AppButton>
      </div>
      <UInput
        v-if="showSearch"
        ref="searchInputRef"
        v-model="search"
        type="text"
        size="md"
        class="mb-3 w-full app-text-body"
        :placeholder="t('shell.workspaces_search')"
      />

      <div v-if="!hasNoProfiles && !hasNoSearchResults" class="max-h-72 space-y-3 overflow-y-auto overflow-x-visible pr-1">
        <div v-if="showRecentSection" class="space-y-1">
          <p class="app-text-eyebrow px-2">
            {{ t("shell.workspaces_recent") }}
          </p>
          <AppButton
            v-for="profile in recentProfiles"
            :key="`recent-${profile.id}`"
            tone="ghost"
            size="sm"
            class="app-switcher-row w-full justify-start gap-3 rounded-xl px-3 py-2 text-left"
            :disabled="switchingId === profile.id"
            @click="selectProfile(profile.id)"
          >
            <span class="min-w-0 flex-1">
              <span class="app-text block truncate text-sm font-semibold">{{ profile.name }}</span>
              <span class="app-muted block text-xs">{{ workspaceMetaLabel(profile) }}</span>
            </span>
            <span v-if="switchingId === profile.id" class="app-muted shrink-0 text-xs">…</span>
          </AppButton>
        </div>

        <div class="space-y-1">
          <p v-if="showRecentSection" class="app-text-eyebrow px-2">
            {{ t("shell.workspaces_all") }}
          </p>
          <div v-for="profile in mainProfiles" :key="profile.id" class="space-y-1">
            <div class="flex items-center gap-1">
            <div
              v-if="editingId === profile.id"
              class="flex min-w-0 flex-1 items-center"
              @focusout="onRenameEditorFocusOut(profile.id, $event)"
            >
              <UInput
                ref="renameInputRef"
                v-model="renameValue"
                size="sm"
                class="h-9 min-w-0 w-full flex-1 text-sm"
                type="text"
                :disabled="isRenaming"
                @keyup.enter="confirmRename(profile.id)"
              />
            </div>

            <AppButton
              v-else
              tone="ghost"
              size="sm"
              class="app-switcher-row group min-w-0 flex-1 justify-start gap-3 rounded-xl px-3 py-2 text-left"
              :class="profile.id === activeProfileId ? 'app-switcher-row-active' : ''"
              :disabled="switchingId === profile.id || deletingId === profile.id"
              :title="profile.id === activeProfileId ? t('shell.workspaces_color_cycle') : undefined"
              :style="activeRowStyle(profile.id)"
              @click="onProfileRowActivate(profile.id)"
            >
              <span class="min-w-0 flex-1">
                <span class="app-switcher-row-title block truncate text-sm font-semibold">{{ profile.name }}</span>
                <span class="app-switcher-row-meta block text-xs">{{ workspaceMetaLabel(profile) }}</span>
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
            </AppButton>

            <div v-if="editingId !== profile.id" class="flex shrink-0 items-center gap-1">
              <div class="relative">
                <UDropdownMenu
                  :items="rowMenuItems(profile)"
                  :content="{ align: 'end', side: 'left', sideOffset: 6 }"
                  :portal="false"
                >
                  <template #default="{ open: menuOpen }">
                    <AppButton
                      tone="secondary"
                      size="icon-md"
                      class="border app-border"
                      :aria-label="rowMenuButtonAriaLabel(profile.name)"
                      :aria-expanded="menuOpen ? 'true' : 'false'"
                      aria-haspopup="menu"
                      :disabled="deletingId === profile.id || isRenaming"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                      </svg>
                    </AppButton>
                  </template>
                </UDropdownMenu>
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
        <AppButton
          tone="secondary"
          size="md"
          class="w-full justify-start text-left app-text-body font-semibold"
          @click="toggleCreate"
        >
          + {{ t("shell.workspaces_new") }}
        </AppButton>
        <div v-if="createOpen" class="app-card rounded-xl border p-2">
          <UInput
            ref="createInputRef"
            v-model="createName"
            type="text"
            size="md"
            class="h-10 w-full text-sm"
            :placeholder="t('profiles.create_placeholder')"
            :disabled="isCreating"
            @keyup.enter="createProfileInline"
            @keyup.escape="toggleCreate"
          />
          <div class="mt-2 flex justify-end gap-2">
            <AppButton
              tone="secondary"
              size="sm"
              :disabled="isCreating"
              @click="toggleCreate"
            >
              {{ t("profiles.cancel") }}
            </AppButton>
            <AppButton
              tone="primary"
              size="sm"
              :disabled="isCreating"
              @click="createProfileInline"
            >
              {{ t("profiles.create_action") }}
            </AppButton>
          </div>
        </div>
      </div>
        </div>
      </template>
    </UPopover>
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
  </div>
</template>
