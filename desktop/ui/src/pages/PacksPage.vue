<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { DragDropEvent } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { PackInspectResponse } from "../schemas/ipc";

const { t } = useI18n();
const error = ref<string | null>(null);
const importPath = ref("");
const importStatus = ref<"idle" | "importing" | "success" | "error">("idle");
const importResult = ref<{ projectId: string; runId: string; peerReviewId: string } | null>(null);
const importDetails = ref<PackInspectResponse | null>(null);
const isInspecting = ref(false);
const isPicking = ref(false);
const isDragging = ref(false);
let unlistenDragDrop: UnlistenFn | null = null;

const activeProfileId = computed(() => appStore.state.activeProfileId);

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "--";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

async function inspectPack(path: string) {
  isInspecting.value = true;
  importDetails.value = null;
  error.value = null;
  try {
    importDetails.value = await appStore.inspectPack(path);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isInspecting.value = false;
  }
}

async function pickPack() {
  isPicking.value = true;
  error.value = null;
  try {
    const selection = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "Pack", extensions: ["zip"] }],
    });
    if (!selection || Array.isArray(selection)) {
      return;
    }
    importPath.value = selection;
    importStatus.value = "idle";
    importResult.value = null;
    await inspectPack(selection);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isPicking.value = false;
  }
}

async function importReview() {
  if (!importPath.value.trim()) {
    error.value = t("packs.import_no_path");
    return;
  }
  if (!importDetails.value) {
    error.value = t("packs.import_invalid");
    return;
  }
  importStatus.value = "importing";
  error.value = null;
  importResult.value = null;
  try {
    const result = await appStore.importPeerReview(importPath.value.trim());
    importStatus.value = "success";
    importResult.value = {
      projectId: result.projectId,
      runId: result.runId,
      peerReviewId: result.peerReviewId,
    };
  } catch (err) {
    importStatus.value = "error";
    error.value = toError(err);
  }
}

function onDragDrop(event: DragDropEvent) {
  if (event.type === "enter" || event.type === "over") {
    isDragging.value = true;
    return;
  }
  if (event.type === "leave") {
    isDragging.value = false;
    return;
  }
  if (event.type !== "drop") {
    return;
  }
  isDragging.value = false;
  const zipPath = event.paths.find((path) => path.toLowerCase().endsWith(".zip"));
  if (!zipPath) {
    error.value = t("packs.import_no_path");
    return;
  }
  importPath.value = zipPath;
  importStatus.value = "idle";
  importResult.value = null;
  error.value = null;
  inspectPack(zipPath);
}

onMounted(async () => {
  try {
    await appStore.bootstrap();
  } catch (err) {
    error.value = toError(err);
  }
  unlistenDragDrop = await getCurrentWindow().onDragDropEvent((event) => {
    onDragDrop(event.payload);
  });
});

onBeforeUnmount(() => {
  if (unlistenDragDrop) {
    unlistenDragDrop();
    unlistenDragDrop = null;
  }
});
</script>

<template>
  <section class="space-y-6">
    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("packs.title") }}
      </div>
      <div class="app-text mt-2 text-sm">{{ t("packs.subtitle") }}</div>
    </div>

    <div v-if="!activeProfileId" class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("packs.no_profile") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
        {{ t("packs.setup_profile") }}
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("packs.import_title") }}
        </div>
        <div
          class="mt-3 rounded-xl border border-dashed border-[var(--app-border)] px-4 py-6 text-center text-xs"
          :class="isDragging ? 'bg-[var(--app-card)]' : 'bg-transparent'"
        >
          <div class="app-text text-sm">{{ t("packs.import_drop_title") }}</div>
          <div class="app-muted mt-1">{{ t("packs.import_drop_hint") }}</div>
          <button
            class="app-link mt-3 inline-flex items-center text-xs underline"
            type="button"
            :disabled="isPicking"
            @click="pickPack"
          >
            {{ t("packs.import_pick") }}
          </button>
        </div>
        <div v-if="isInspecting" class="app-muted mt-3 text-xs">
          {{ t("packs.import_checking") }}
        </div>
        <div v-else-if="importDetails" class="mt-3 space-y-2 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <span class="app-text text-sm font-semibold">{{ importDetails.fileName }}</span>
            <span class="app-muted">{{ formatBytes(importDetails.fileBytes) }}</span>
          </div>
          <div class="app-text">
            <span class="app-muted">{{ t("packs.import_from") }}:</span>
            {{
              importDetails.reviewerTag ||
              importDetails.profileId ||
              t("packs.import_from_unknown")
            }}
          </div>
          <div class="app-text">
            <span class="app-muted">{{ t("packs.import_contents") }}:</span>
            {{
              importDetails.files
                .map((item) => `${item.role} ${formatBytes(item.bytes)}`)
                .join(", ")
            }}
          </div>
          <div class="app-muted">
            {{ t("packs.import_pack_id") }}: {{ importDetails.packId }}
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button
            class="app-button-info cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="importStatus === 'importing' || !importPath || !importDetails"
            @click="importReview"
          >
            {{ t("packs.import_action") }}
          </button>
        </div>
        <div v-if="importStatus === 'success'" class="app-subtle mt-2 text-xs">
          {{ t("packs.import_success") }}
        </div>
        <RouterLink
          v-if="importResult"
          class="app-link mt-2 inline-block text-xs underline"
          :to="`/talks/${importResult.projectId}`"
        >
          {{ t("packs.import_view_talk") }}
        </RouterLink>
      </div>
    </div>

    <div v-if="error" class="app-danger-text text-xs">
      {{ error }}
    </div>
  </section>
</template>
