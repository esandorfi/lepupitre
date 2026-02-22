<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { invoke } from "@tauri-apps/api/core";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { RunSummary } from "../schemas/ipc";

const { t } = useI18n();
const runs = ref<RunSummary[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const exportPath = ref<string | null>(null);
const exportingRunId = ref<string | null>(null);
const isRevealing = ref(false);
const importPath = ref("");
const importStatus = ref<"idle" | "importing" | "success" | "error">("idle");

const activeProfileId = computed(() => appStore.state.activeProfileId);
const activeProject = computed(() => appStore.state.activeProject);
const talkLabel = computed(() => {
  if (!activeProject.value) {
    return "";
  }
  const number = appStore.getTalkNumber(activeProject.value.id);
  const prefix = number ? `T${number} · ` : "";
  return `${prefix}${activeProject.value.title}`;
});

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

function runStatus(run: RunSummary) {
  if (run.feedback_id) {
    return t("packs.run_status_feedback");
  }
  if (run.transcript_id) {
    return t("packs.run_status_transcribed");
  }
  return t("packs.run_status_recorded");
}

async function loadRuns() {
  runs.value = [];
  exportPath.value = null;
  error.value = null;
  if (!activeProject.value) {
    return;
  }
  isLoading.value = true;
  try {
    await appStore.bootstrap();
    runs.value = await appStore.getRuns(activeProject.value.id, 12);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
}

async function exportPack(runId: string) {
  exportPath.value = null;
  exportingRunId.value = runId;
  error.value = null;
  try {
    const result = await appStore.exportPack(runId);
    exportPath.value = result.path;
  } catch (err) {
    error.value = toError(err);
  } finally {
    exportingRunId.value = null;
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

async function importReview() {
  if (!importPath.value.trim()) {
    return;
  }
  importStatus.value = "importing";
  error.value = null;
  try {
    await appStore.importPeerReview(importPath.value.trim());
    importStatus.value = "success";
  } catch (err) {
    importStatus.value = "error";
    error.value = toError(err);
  }
}

onMounted(loadRuns);
watch(
  () => activeProject.value?.id,
  () => {
    loadRuns();
  }
);
</script>

<template>
  <section class="space-y-6">
    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("packs.title") }}
      </div>
      <div class="app-text mt-2 text-sm">{{ t("packs.subtitle") }}</div>
      <div v-if="talkLabel" class="app-muted mt-2 text-xs">{{ talkLabel }}</div>
    </div>

    <div v-if="!activeProfileId" class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("packs.no_profile") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
        {{ t("packs.setup_profile") }}
      </RouterLink>
    </div>

    <div v-else-if="!activeProject" class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("packs.no_talk") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/project/new">
        {{ t("packs.setup_talk") }}
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("packs.run_list_title") }}
        </div>
        <div v-if="isLoading" class="app-muted mt-3 text-xs">
          {{ t("boss_run.loading") }}
        </div>
        <div v-else-if="runs.length === 0" class="app-muted mt-3 text-xs">
          {{ t("boss_run.latest_empty") }}
        </div>
        <div v-else class="mt-3 space-y-2 text-xs">
          <div
            v-for="run in runs"
            :key="run.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
          >
            <div>
              <div class="app-text text-sm">{{ t("talk_report.timeline_boss_run") }}</div>
              <div class="app-muted text-[11px]">
                {{ formatDate(run.created_at) }} · {{ runStatus(run) }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="app-button-secondary cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                :disabled="exportingRunId === run.id"
                @click="exportPack(run.id)"
              >
                {{ t("packs.export") }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="exportPath" class="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span class="app-muted">{{ t("packs.export_path") }}:</span>
          <span class="app-text max-w-[360px] truncate" style="direction: rtl; text-align: left;">
            {{ exportPath }}
          </span>
          <button
            class="app-link text-xs underline"
            type="button"
            :disabled="isRevealing"
            @click="revealExport"
          >
            {{ t("packs.export_reveal") }}
          </button>
          <span class="app-subtle text-xs">{{ t("packs.export_ready") }}</span>
        </div>
      </div>

      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("packs.import_title") }}
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <input
            v-model="importPath"
            class="app-input w-full min-w-[240px] rounded-lg border px-3 py-2 text-sm"
            :placeholder="t('packs.import_placeholder')"
          />
          <button
            class="app-button-info cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="importStatus === 'importing'"
            @click="importReview"
          >
            {{ t("packs.import_action") }}
          </button>
        </div>
        <div v-if="importStatus === 'success'" class="app-subtle mt-2 text-xs">
          {{ t("packs.import_success") }}
        </div>
      </div>
    </div>

    <div v-if="error" class="app-danger-text text-xs">
      {{ error }}
    </div>
  </section>
</template>
