<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";

const { t } = useI18n();
const route = useRoute();

const error = ref<string | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const saveStatus = ref<"idle" | "saving" | "saved" | "error">("idle");
const outline = ref("");
const exportPath = ref<string | null>(null);
const isExporting = ref(false);
const isRevealing = ref(false);

const activeProfileId = computed(() => appStore.state.activeProfileId);
const selectedProjectId = computed(() => {
  const queryId = String(route.query.projectId || "");
  if (queryId) {
    return queryId;
  }
  return appStore.state.activeProject?.id ?? "";
});
const selectedProject = computed(() => {
  const projectId = selectedProjectId.value;
  if (!projectId) {
    return null;
  }
  return (
    appStore.state.projects.find((project) => project.id === projectId) ??
    appStore.state.activeProject ??
    null
  );
});
const talkLabel = computed(() => {
  if (!selectedProject.value) {
    return "";
  }
  const number = appStore.getTalkNumber(selectedProject.value.id);
  const prefix = number ? `T${number} · ` : "";
  return `${prefix}${selectedProject.value.title}`;
});

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function loadOutline() {
  error.value = null;
  exportPath.value = null;
  outline.value = "";
  isLoading.value = true;
  try {
    await appStore.bootstrap();
    await appStore.loadProjects();
    const projectId = selectedProjectId.value;
    if (!projectId || !activeProfileId.value) {
      return;
    }
    const doc = await appStore.getOutline(projectId);
    outline.value = doc.markdown;
    saveStatus.value = "idle";
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
}

async function saveOutline() {
  if (!selectedProjectId.value) {
    error.value = t("builder.no_talk");
    return;
  }
  isSaving.value = true;
  saveStatus.value = "saving";
  error.value = null;
  try {
    await appStore.saveOutline(selectedProjectId.value, outline.value);
    saveStatus.value = "saved";
    setTimeout(() => {
      saveStatus.value = "idle";
    }, 1200);
  } catch (err) {
    saveStatus.value = "error";
    error.value = toError(err);
  } finally {
    isSaving.value = false;
  }
}

async function exportOutline() {
  if (!selectedProjectId.value) {
    error.value = t("builder.no_talk");
    return;
  }
  isExporting.value = true;
  error.value = null;
  try {
    const result = await appStore.exportOutline(selectedProjectId.value);
    exportPath.value = result.path;
  } catch (err) {
    error.value = toError(err);
  } finally {
    isExporting.value = false;
  }
}

async function revealExport() {
  if (!exportPath.value) {
    return;
  }
  isRevealing.value = true;
  error.value = null;
  try {
    await invoke("audio_reveal_wav", { path: exportPath.value });
  } catch (err) {
    error.value = toError(err);
  } finally {
    isRevealing.value = false;
  }
}

onMounted(loadOutline);
watch(
  () => selectedProjectId.value,
  () => {
    loadOutline();
  }
);
</script>

<template>
  <section class="space-y-6">
    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("builder.title") }}
      </div>
      <div class="app-text mt-2 text-sm">{{ t("builder.subtitle") }}</div>
      <div v-if="talkLabel" class="app-muted mt-2 text-xs">{{ talkLabel }}</div>
    </div>

    <div v-if="!activeProfileId" class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("builder.no_profile") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
        {{ t("builder.setup_profile") }}
      </RouterLink>
    </div>

    <div v-else-if="!selectedProjectId" class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("builder.no_talk") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/project/new">
        {{ t("builder.setup_talk") }}
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("builder.outline_label") }}
        </div>
        <textarea
          v-model="outline"
          rows="12"
          class="app-input mt-3 w-full rounded-lg border px-3 py-2 text-sm"
        ></textarea>
        <div class="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <button
            class="app-button-primary cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isSaving"
            @click="saveOutline"
          >
            {{ t("builder.save") }}
          </button>
          <button
            class="app-button-secondary cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isExporting"
            @click="exportOutline"
          >
            {{ t("builder.export") }}
          </button>
          <span v-if="saveStatus === 'saving'" class="app-muted text-xs">
            {{ t("builder.saving") }}
          </span>
          <span v-else-if="saveStatus === 'saved'" class="app-subtle text-xs">
            {{ t("builder.saved") }}
          </span>
        </div>
        <div v-if="exportPath" class="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span class="app-muted">{{ t("builder.export_path") }}:</span>
          <span class="app-text max-w-[360px] truncate" style="direction: rtl; text-align: left;">
            {{ exportPath }}
          </span>
          <button
            class="app-link text-xs underline"
            type="button"
            :disabled="isRevealing"
            @click="revealExport"
          >
            {{ t("builder.export_reveal") }}
          </button>
          <span class="app-subtle text-xs">{{ t("builder.export_ready") }}</span>
        </div>
        <div v-if="isLoading" class="app-muted mt-3 text-xs">
          {{ t("builder.loading") }}
        </div>
        <div v-if="error" class="app-danger-text mt-3 text-xs">
          {{ error }}
        </div>
      </div>
    </div>
  </section>
</template>
