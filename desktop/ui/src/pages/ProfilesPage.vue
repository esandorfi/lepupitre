<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ComponentPublicInstance } from "vue";
import { useRoute, useRouter } from "vue-router";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useI18n } from "../lib/i18n";
import type { ProfileSummary } from "../schemas/ipc";
import { appStore } from "../stores/app";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const name = ref("");
const error = ref<string | null>(null);
const isSaving = ref(false);
const isRenaming = ref(false);
const deletingId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const renameValue = ref("");
const renameOriginal = ref("");
const openMenuId = ref<string | null>(null);
const deleteTarget = ref<ProfileSummary | null>(null);
const createInput = ref<HTMLInputElement | null>(null);
const createSection = ref<HTMLElement | null>(null);
const pageRef = ref<HTMLElement | null>(null);

const renameInputs = new Map<string, HTMLInputElement>();
const setRenameInput =
  (profileId: string) =>
  (el: Element | ComponentPublicInstance | null, _refs?: Record<string, unknown>) => {
    void _refs;
    if (el && el instanceof HTMLInputElement) {
      renameInputs.set(profileId, el);
    } else {
      renameInputs.delete(profileId);
    }
  };

const profiles = computed(() => appStore.state.profiles);
const activeProfileId = computed(() => appStore.state.activeProfileId);
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

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
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
  return appStore.state.profiles.some(
    (profile) =>
      profile.id !== exceptId && profile.name.trim().toLowerCase() === nextName.trim().toLowerCase()
  );
}

async function focusCreateForm() {
  await nextTick();
  createSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  createInput.value?.focus();
  createInput.value?.select();
}

async function createProfile() {
  const trimmed = name.value.trim();
  if (!trimmed) {
    error.value = t("profiles.name_required");
    return;
  }
  if (hasDuplicateName(trimmed)) {
    error.value = t("profiles.name_exists");
    return;
  }

  isSaving.value = true;
  error.value = null;
  try {
    await appStore.createProfile(trimmed);
    name.value = "";
    await router.push("/");
  } catch (err) {
    const message = toError(err);
    error.value = message;
  } finally {
    isSaving.value = false;
  }
}

async function switchProfile(profileId: string) {
  if (profileId === activeProfileId.value) {
    return;
  }
  error.value = null;
  try {
    await appStore.switchProfile(profileId);
    await router.push("/");
  } catch (err) {
    const message = toError(err);
    error.value = message;
  }
}

function startRename(profileId: string, currentName: string) {
  openMenuId.value = null;
  editingId.value = profileId;
  renameValue.value = currentName;
  renameOriginal.value = currentName;
  nextTick(() => {
    const input = renameInputs.get(profileId);
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
  const nextName = renameValue.value.trim();
  const originalTrimmed = renameOriginal.value.trim();
  if (!nextName || nextName === originalTrimmed) {
    cancelRename();
    return;
  }
  if (hasDuplicateName(nextName, profileId)) {
    error.value = t("profiles.name_exists");
    return;
  }

  isRenaming.value = true;
  error.value = null;
  try {
    await appStore.renameProfile(profileId, nextName);
    cancelRename();
  } catch (err) {
    error.value = toError(err);
  } finally {
    isRenaming.value = false;
  }
}

function toggleMenu(profileId: string) {
  openMenuId.value = openMenuId.value === profileId ? null : profileId;
}

function requestDelete(profile: ProfileSummary) {
  openMenuId.value = null;
  deleteTarget.value = profile;
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
    if (route.name === "profiles") {
      await router.push("/");
    }
  } catch (err) {
    const message = toError(err);
    error.value = `${target.name}: ${message}`;
  } finally {
    deletingId.value = null;
  }
}

function handleDocumentMouseDown(event: MouseEvent) {
  if (!openMenuId.value) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (pageRef.value?.contains(target)) {
    const menuRoot = (target as HTMLElement).closest?.("[data-profile-menu-root='true']");
    if (menuRoot) {
      return;
    }
  }
  openMenuId.value = null;
}

async function maybeFocusCreateFromRoute() {
  if (!route.query.create) {
    return;
  }
  await focusCreateForm();
}

watch(
  () => route.query.create,
  () => {
    void maybeFocusCreateFromRoute();
  }
);

onMounted(async () => {
  if (typeof document !== "undefined") {
    document.addEventListener("mousedown", handleDocumentMouseDown);
  }
  try {
    await appStore.ensureBootstrapped();
  } catch (err) {
    error.value = toError(err);
  }
  await maybeFocusCreateFromRoute();
});

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("mousedown", handleDocumentMouseDown);
  }
});
</script>

<template>
  <section ref="pageRef" class="space-y-6">
    <header class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 class="app-text text-2xl font-semibold tracking-tight">{{ t("profiles.title") }}</h1>
        <p class="app-muted mt-1 text-sm">{{ t("profiles.subtitle") }}</p>
      </div>
      <button
        class="app-button-primary app-focus-ring min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold"
        type="button"
        @click="focusCreateForm"
      >
        {{ t("profiles.create_action") }}
      </button>
    </header>

    <div v-if="profiles.length === 0" class="app-card rounded-2xl border px-5 py-8 text-center">
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full app-avatar text-sm font-bold">
        WS
      </div>
      <h2 class="app-text text-lg font-semibold">{{ t("profiles.empty_title") }}</h2>
      <p class="app-muted mx-auto mt-2 max-w-xl text-sm">{{ t("profiles.empty_body") }}</p>
      <button
        class="app-button-primary app-focus-ring mt-4 min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold"
        type="button"
        @click="focusCreateForm"
      >
        {{ t("profiles.create_action") }}
      </button>
    </div>

    <section v-else class="app-surface rounded-2xl border p-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="app-subtle text-xs font-semibold uppercase tracking-[0.2em]">
          {{ t("profiles.existing_title") }}
        </h2>
      </div>

      <div class="mt-4 space-y-2">
        <div
          v-for="profile in profiles"
          :key="profile.id"
          class="app-card flex flex-col gap-3 rounded-xl border px-3 py-3 md:flex-row md:items-center md:justify-between"
        >
          <div class="flex min-w-0 items-start gap-3">
            <div class="app-avatar mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {{ initialsFor(profile.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <div v-if="editingId !== profile.id" class="app-text truncate text-sm font-semibold">
                {{ profile.name }}
              </div>
              <div v-else class="flex flex-wrap gap-2">
                <label class="sr-only" :for="`rename-${profile.id}`">{{ t("profiles.rename") }}</label>
                <input
                  :id="`rename-${profile.id}`"
                  :ref="setRenameInput(profile.id)"
                  v-model="renameValue"
                  :disabled="isRenaming"
                  class="app-input app-focus-ring min-h-11 min-w-[240px] flex-1 rounded-lg border px-3 py-2 text-sm"
                  type="text"
                  @blur="confirmRename(profile.id)"
                  @keyup.enter="confirmRename(profile.id)"
                  @keyup.escape="cancelRename"
                />
              </div>
              <div class="app-muted mt-1 text-xs">
                {{ formatBytes(profile.size_bytes) }}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="profile.id !== activeProfileId"
              class="app-button-secondary app-focus-ring min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold"
              type="button"
              @click="switchProfile(profile.id)"
            >
              {{ t("profiles.switch") }}
            </button>
            <span
              v-else
              class="app-badge-accent inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold"
            >
              {{ t("profiles.active") }}
            </span>

            <div class="relative" data-profile-menu-root="true">
              <button
                class="app-button-secondary app-focus-ring inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full"
                type="button"
                :aria-label="`${t('profiles.row_actions')}: ${profile.name}`"
                :aria-expanded="openMenuId === profile.id ? 'true' : 'false'"
                aria-haspopup="menu"
                :disabled="isRenaming || deletingId === profile.id"
                @click="toggleMenu(profile.id)"
              >
                <svg
                  class="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>

              <div
                v-if="openMenuId === profile.id"
                class="app-menu-panel absolute top-[calc(100%+0.4rem)] right-0 z-20 w-44 rounded-xl border p-1 shadow-lg"
                role="menu"
              >
                <button
                  class="app-menu-item app-focus-ring flex min-h-10 w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm"
                  type="button"
                  :disabled="isRenaming"
                  @click="startRename(profile.id, profile.name)"
                >
                  {{ t("profiles.rename") }}
                </button>
                <button
                  class="app-menu-item app-focus-ring app-danger-text flex min-h-10 w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm"
                  type="button"
                  :disabled="deletingId === profile.id"
                  @click="requestDelete(profile)"
                >
                  {{ t("profiles.delete") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p v-if="error" class="app-danger-text mt-3 text-xs">{{ error }}</p>
    </section>

    <section ref="createSection" class="app-card rounded-2xl border p-4">
      <h2 class="app-subtle text-xs font-semibold uppercase tracking-[0.2em]">
        {{ t("profiles.add_title") }}
      </h2>
      <div class="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <label class="app-text text-sm font-medium" for="workspace-name-input">
            {{ t("profiles.create_placeholder") }}
          </label>
          <input
            id="workspace-name-input"
            ref="createInput"
            v-model="name"
            type="text"
            class="app-input app-focus-ring mt-2 h-11 w-full rounded-lg border px-3 text-sm"
            :placeholder="t('profiles.create_placeholder')"
            @keyup.enter="createProfile"
            @keyup.escape="name = ''"
          />
          <p class="app-muted mt-2 text-xs">{{ t("profiles.create_helper") }}</p>
        </div>
        <button
          class="app-button-primary app-focus-ring min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          :disabled="isSaving"
          @click="createProfile"
        >
          {{ t("profiles.create_action") }}
        </button>
      </div>
      <p v-if="error" class="app-danger-text mt-3 text-xs">{{ error }}</p>
    </section>

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
  </section>
</template>
