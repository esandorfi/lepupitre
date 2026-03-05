<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { ComponentPublicInstance } from "vue";
import { useRoute, useRouter } from "vue-router";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import { useI18n } from "@/lib/i18n";
import type { ProfileSummary } from "@/schemas/ipc";
import { appState, sessionStore, workspaceStore } from "@/stores/app";

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
const deleteTarget = ref<ProfileSummary | null>(null);
const createSection = ref<HTMLElement | null>(null);

type InputRefTarget =
  | HTMLInputElement
  | ComponentPublicInstance
  | { $el?: Element | null; inputRef?: HTMLInputElement | null }
  | null;

const createInput = ref<InputRefTarget>(null);
const renameInputs = new Map<string, InputRefTarget>();

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

const profiles = computed(() => appState.profiles);
const activeProfileId = computed(() => appState.activeProfileId);
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
  return `${profile.talks_count} ${talksLabel} · ${formatBytes(profile.size_bytes)}`;
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

async function focusCreateForm() {
  await nextTick();
  createSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  const input = resolveInputElement(createInput.value);
  input?.focus();
  input?.select();
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
    await workspaceStore.createProfile(trimmed);
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
    await workspaceStore.switchProfile(profileId);
    await router.push("/");
  } catch (err) {
    const message = toError(err);
    error.value = message;
  }
}

function startRename(profileId: string, currentName: string) {
  editingId.value = profileId;
  renameValue.value = currentName;
  renameOriginal.value = currentName;
  nextTick(() => {
    const input = resolveInputElement(renameInputs.get(profileId) ?? null);
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
    await workspaceStore.renameProfile(profileId, nextName);
    cancelRename();
  } catch (err) {
    error.value = toError(err);
  } finally {
    isRenaming.value = false;
  }
}

function requestDelete(profile: ProfileSummary) {
  deleteTarget.value = profile;
}

function profileMenuItems(profile: ProfileSummary) {
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
      onSelect: () => requestDelete(profile),
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
    await workspaceStore.deleteProfile(target.id);
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
  try {
    await sessionStore.ensureBootstrapped();
  } catch (err) {
    error.value = toError(err);
  }
  await maybeFocusCreateFromRoute();
});
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 class="app-text text-2xl font-semibold tracking-tight">{{ t("profiles.title") }}</h1>
        <p class="app-muted mt-1 text-sm">{{ t("profiles.subtitle") }}</p>
      </div>
      <UButton size="lg" color="primary" @click="focusCreateForm">
        {{ t("profiles.create_action") }}
      </UButton>
    </header>

    <UCard v-if="profiles.length === 0" as="div" class="app-panel app-panel-compact rounded-2xl px-5 py-8 text-center" variant="outline">
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full app-avatar text-sm font-bold">
        WS
      </div>
      <h2 class="app-text text-lg font-semibold">{{ t("profiles.empty_title") }}</h2>
      <p class="app-muted mx-auto mt-2 max-w-xl text-sm">{{ t("profiles.empty_body") }}</p>
      <UButton class="mt-4" size="lg" color="primary" @click="focusCreateForm">
        {{ t("profiles.create_action") }}
      </UButton>
    </UCard>

    <UCard v-else as="section" class="app-panel app-panel-compact" variant="outline">
      <div class="flex items-center justify-between gap-3">
        <h2 class="app-subtle text-xs font-semibold uppercase tracking-[0.2em]">
          {{ t("profiles.existing_title") }}
        </h2>
      </div>

      <div class="mt-4 space-y-2">
        <UCard
          v-for="profile in profiles"
          :key="profile.id"
          as="div"
         
          class="app-panel app-panel-compact flex flex-col gap-3 rounded-xl px-3 py-3 md:flex-row md:items-center md:justify-between"
         variant="outline">
          <div class="flex min-w-0 items-start gap-3">
            <div class="app-avatar mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {{ initialsFor(profile.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <div v-if="editingId !== profile.id" class="app-text truncate text-sm font-semibold">
                {{ profile.name }}
              </div>
              <div v-else class="flex flex-wrap gap-2">
                <UInput
                  :id="`rename-${profile.id}`"
                  :ref="setRenameInput(profile.id)"
                  v-model="renameValue"
                  :disabled="isRenaming"
                  :aria-label="t('profiles.rename')"
                  class="min-w-[240px] flex-1 app-text-body"
                  size="md"
                  type="text"
                  @blur="confirmRename(profile.id)"
                  @keyup.enter="confirmRename(profile.id)"
                  @keyup.escape="cancelRename"
                />
              </div>
              <div class="app-muted mt-1 text-xs">{{ formatProfileMeta(profile) }}</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              v-if="profile.id !== activeProfileId"
              size="lg"
             
              color="neutral"
             variant="outline" @click="switchProfile(profile.id)">
              {{ t("profiles.switch") }}
            </UButton>
            <UBadge
              v-else
              size="md"
             
             color="primary" variant="solid">
              {{ t("profiles.active") }}
            </UBadge>

            <UDropdownMenu
              :items="profileMenuItems(profile)"
              :content="{ align: 'end', side: 'bottom', sideOffset: 6 }"
              :portal="false"
            >
              <template #default="{ open: menuOpen }">
                <UButton
                 
                 
                  :aria-label="`${t('profiles.row_actions')}: ${profile.name}`"
                  :aria-expanded="menuOpen ? 'true' : 'false'"
                  aria-haspopup="menu"
                  :disabled="isRenaming || deletingId === profile.id"
                 color="neutral" variant="outline" size="xl" square="true">
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
                </UButton>
              </template>
            </UDropdownMenu>
          </div>
        </UCard>
      </div>

      <p v-if="error" class="app-danger-text mt-3 text-xs">{{ error }}</p>
    </UCard>

    <UCard as="section" class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
      <div ref="createSection">
        <h2 class="app-subtle text-xs font-semibold uppercase tracking-[0.2em]">
          {{ t("profiles.add_title") }}
        </h2>
        <div class="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <UFormField
            :label="t('profiles.create_placeholder')"
            :help="t('profiles.create_helper')"
            class="app-text text-sm"
          >
            <UInput
              id="workspace-name-input"
              ref="createInput"
              v-model="name"
              type="text"
              class="w-full app-text-body"
              size="md"
              :placeholder="t('profiles.create_placeholder')"
              @keyup.enter="createProfile"
              @keyup.escape="name = ''"
            />
          </UFormField>
          <UButton
            size="lg"
           
            :disabled="isSaving"
            color="primary"
           @click="createProfile">
            {{ t("profiles.create_action") }}
          </UButton>
        </div>
      </div>
      <p v-if="error" class="app-danger-text mt-3 text-xs">{{ error }}</p>
    </UCard>

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

