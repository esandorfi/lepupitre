<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";

const { t } = useI18n();
const router = useRouter();

const open = ref(false);
const search = ref("");
const error = ref<string | null>(null);
const switchingId = ref<string | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLDivElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);

const profiles = computed(() => appStore.state.profiles);
const activeProfileId = computed(() => appStore.state.activeProfileId);
const activeProfile = computed(
  () => profiles.value.find((profile) => profile.id === activeProfileId.value) ?? null
);

const filteredProfiles = computed(() => {
  if (!showSearch.value) {
    return profiles.value;
  }
  const needle = search.value.trim().toLowerCase();
  if (!needle) {
    return profiles.value;
  }
  return profiles.value.filter((profile) => profile.name.toLowerCase().includes(needle));
});
const showSearch = computed(() => profiles.value.length > 10);

const currentLabel = computed(() => {
  if (activeProfile.value) {
    return activeProfile.value.name;
  }
  if (appStore.state.isBootstrapping) {
    return t("shell.workspaces_loading");
  }
  return t("shell.workspaces_none");
});

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "WS";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

const currentInitials = computed(() => initialsFor(activeProfile.value?.name ?? "Workspace"));

function closePanel() {
  open.value = false;
  error.value = null;
  search.value = "";
  nextTick(() => {
    triggerRef.value?.focus();
  });
}

function togglePanel() {
  open.value = !open.value;
}

async function openManage() {
  await router.push("/profiles");
  closePanel();
}

async function openCreate() {
  await router.push({ path: "/profiles", query: { create: "1" } });
  closePanel();
}

async function selectProfile(profileId: string) {
  if (profileId === activeProfileId.value || switchingId.value) {
    return;
  }
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

function onDocumentMouseDown(event: MouseEvent) {
  if (!open.value) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (panelRef.value?.contains(target) || triggerRef.value?.contains(target)) {
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
      <span class="app-avatar inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
        {{ currentInitials }}
      </span>
      <span class="min-w-0 flex-1 truncate font-semibold">
        <span class="opacity-80">WS · </span>{{ currentLabel }}
      </span>
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
    >
      <label class="app-subtle mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em]">
        {{ t("nav.profiles") }}
      </label>
      <input
        v-if="showSearch"
        ref="searchInputRef"
        v-model="search"
        type="text"
        class="app-input app-focus-ring mb-3 h-11 w-full rounded-xl border px-3 text-sm"
        :placeholder="t('shell.workspaces_search')"
      />

      <div v-if="filteredProfiles.length > 0" class="max-h-72 space-y-1 overflow-auto pr-1">
        <button
          v-for="profile in filteredProfiles"
          :key="profile.id"
          class="app-switcher-row app-focus-ring flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left"
          type="button"
          :disabled="switchingId === profile.id"
          @click="selectProfile(profile.id)"
        >
          <span class="app-avatar inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
            {{ initialsFor(profile.name) }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="app-text block truncate text-sm font-semibold">{{ profile.name }}</span>
            <span class="app-muted block text-xs">{{ Math.round(profile.size_bytes / 1024) }} KB</span>
          </span>
          <span
            v-if="profile.id === activeProfileId"
            class="app-badge-accent shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
          >
            {{ t("profiles.active") }}
          </span>
          <span v-else class="app-muted shrink-0 text-xs">{{ t("profiles.switch") }}</span>
        </button>
      </div>
      <p v-else class="app-muted py-2 text-sm">{{ t("shell.workspaces_empty_search") }}</p>

      <p v-if="error" class="app-danger-text mt-2 text-xs">{{ error }}</p>

      <div class="app-divider my-3"></div>
      <div class="grid gap-2">
        <button
          class="app-menu-item app-focus-ring cursor-pointer rounded-xl px-3 py-2 text-left text-sm"
          type="button"
          @click="openManage"
        >
          {{ t("shell.workspaces_manage") }}
        </button>
        <button
          class="app-menu-item app-focus-ring cursor-pointer rounded-xl px-3 py-2 text-left text-sm"
          type="button"
          @click="openCreate"
        >
          {{ t("shell.workspaces_create") }}
        </button>
      </div>
    </div>
  </div>
</template>
