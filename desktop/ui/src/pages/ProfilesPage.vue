<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import type { ComponentPublicInstance } from "vue";
import { appStore } from "../stores/app";

const name = ref("");
const error = ref<string | null>(null);
const isSaving = ref(false);
const isRenaming = ref(false);
const deletingId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const renameValue = ref("");
const renameOriginal = ref("");
const confirmDeleteId = ref<string | null>(null);
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

async function createProfile() {
  if (!name.value.trim()) {
    return;
  }
  isSaving.value = true;
  error.value = null;
  try {
    await appStore.createProfile(name.value.trim());
    name.value = "";
  } catch (err) {
    error.value = toError(err);
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
  } catch (err) {
    error.value = toError(err);
  }
}

function startRename(profileId: string, currentName: string) {
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
  if (!nextName || nextName === renameOriginal.value.trim()) {
    cancelRename();
    return;
  }
  const duplicate = appStore.state.profiles.some(
    (profile) =>
      profile.id !== profileId && profile.name.toLowerCase() === nextName.toLowerCase()
  );
  if (duplicate) {
    error.value = "Profile name already exists";
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

function requestDelete(profileId: string) {
  confirmDeleteId.value = profileId;
}

function cancelDelete() {
  confirmDeleteId.value = null;
}

async function confirmDelete(profileId: string, profileName: string) {
  deletingId.value = profileId;
  error.value = null;
  try {
    await appStore.deleteProfile(profileId);
    cancelDelete();
  } catch (err) {
    error.value = `${profileName}: ${toError(err)}`;
  } finally {
    deletingId.value = null;
  }
}

onMounted(() => {
  appStore.loadProfiles().catch((err) => {
    error.value = toError(err);
  });
});
</script>

<template>
  <section class="space-y-6" @click.self="cancelRename">
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold">Profiles</h1>
      <p class="text-sm text-slate-400">Create a profile to start your local workspace.</p>
    </div>

    <div
      v-if="profiles.length === 0"
      class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
        Create profile
      </h2>
      <div class="mt-3 flex flex-wrap gap-3">
        <input
          v-model="name"
          type="text"
          class="min-w-[240px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          placeholder="Profile name"
          @focus="name = ''"
          @keyup.enter="createProfile"
          @keyup.escape="name = ''"
        />
        <button
          class="cursor-pointer rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          type="button"
          :disabled="isSaving"
          @click="createProfile"
        >
          Create
        </button>
      </div>
      <p v-if="error" class="mt-2 text-xs text-rose-300">{{ error }}</p>
    </div>

    <div v-else class="space-y-6">
      <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Existing profiles
        </h2>

        <div class="mt-4 space-y-2">
          <div
            v-for="profile in profiles"
            :key="profile.id"
            class="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div class="min-w-0 flex-1">
              <div v-if="editingId !== profile.id" class="text-sm text-slate-100">
                {{ profile.name }}
              </div>
              <div v-else class="flex flex-wrap gap-2">
                <input
                  :ref="setRenameInput(profile.id)"
                  v-model="renameValue"
                  :disabled="isRenaming"
                  class="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  type="text"
                  @blur="confirmRename(profile.id)"
                  @keyup.enter="confirmRename(profile.id)"
                  @keyup.escape="cancelRename"
                />
              </div>
              <div class="text-xs text-slate-500">
                {{ profile.id }} · {{ formatBytes(profile.size_bytes) }}
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                class="cursor-pointer rounded-full px-3 py-1 text-xs font-semibold"
                :class="
                  profile.id === activeProfileId
                    ? 'bg-emerald-500 text-emerald-950'
                    : 'bg-slate-800 text-slate-200'
                "
                type="button"
                @click="switchProfile(profile.id)"
              >
                {{ profile.id === activeProfileId ? "Active" : "Switch" }}
              </button>
              <button
                class="cursor-pointer rounded-full bg-slate-800/60 p-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                type="button"
                :disabled="editingId === profile.id || isRenaming"
                @click="startRename(profile.id, profile.name)"
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
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                class="cursor-pointer rounded-full bg-rose-500/10 p-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:bg-slate-700"
                type="button"
                :disabled="deletingId === profile.id"
                @click="requestDelete(profile.id)"
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
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </div>
            <div
              v-if="confirmDeleteId === profile.id"
              class="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
            >
              <div>Delete this profile and its local data?</div>
              <div class="mt-2 flex gap-2">
                <button
                  class="cursor-pointer rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/30"
                  type="button"
                  :disabled="deletingId === profile.id"
                  @click="confirmDelete(profile.id, profile.name)"
                >
                  Delete
                </button>
                <button
                  class="cursor-pointer rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                  type="button"
                  :disabled="deletingId === profile.id"
                  @click="cancelDelete"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <p v-if="error" class="mt-3 text-xs text-rose-300">{{ error }}</p>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <h2 class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Add profile
        </h2>
        <div class="mt-3 flex flex-wrap gap-3">
          <input
            v-model="name"
            type="text"
            class="min-w-[240px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            placeholder="Profile name"
            @focus="name = ''"
            @keyup.enter="createProfile"
            @keyup.escape="name = ''"
          />
          <button
            class="cursor-pointer rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            type="button"
            :disabled="isSaving"
            @click="createProfile"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
