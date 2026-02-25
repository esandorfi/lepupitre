<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { invoke } from "@tauri-apps/api/core";
import TalkStepTabs from "../components/TalkStepTabs.vue";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { PeerReviewSummary, QuestReportItem, RunSummary } from "../schemas/ipc";

const { t } = useI18n();
const route = useRoute();
const projectId = computed(() => String(route.params.projectId || ""));

const error = ref<string | null>(null);
const isLoading = ref(false);
const isActivating = ref(false);
const report = ref<QuestReportItem[]>([]);
const runs = ref<RunSummary[]>([]);
const peerReviews = ref<PeerReviewSummary[]>([]);
const exportPath = ref<string | null>(null);
const exportingRunId = ref<string | null>(null);
const isExportingOutline = ref(false);
const isRevealing = ref(false);
const exportError = ref<string | null>(null);

const project = computed(() =>
  appStore.state.projects.find((item) => item.id === projectId.value) ?? null
);
const isActive = computed(() => appStore.state.activeProject?.id === projectId.value);
const talkNumber = computed(() => project.value?.talk_number ?? null);

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
    return t("talk_report.timeline_feedback");
  }
  if (run.transcript_id) {
    return t("talk_report.timeline_transcribed");
  }
  if (run.audio_artifact_id) {
    return t("talk_report.timeline_recorded");
  }
  return t("talk_report.timeline_started");
}

async function markExportStage() {
  if (!projectId.value) {
    return;
  }
  try {
    await appStore.ensureProjectStageAtLeast(projectId.value, "export");
  } catch {
    // keep export actions non-blocking
  }
}

const summary = computed(() => {
  const total = report.value.length;
  const started = report.value.filter((item) => item.attempt_id).length;
  const feedbackCount = report.value.filter((item) => item.has_feedback).length;
  const last = report.value
    .map((item) => item.attempt_created_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .pop();
  return { total, started, feedbackCount, last };
});

async function exportPack(runId: string) {
  exportPath.value = null;
  exportingRunId.value = runId;
  exportError.value = null;
  try {
    await markExportStage();
    const result = await appStore.exportPack(runId);
    exportPath.value = result.path;
  } catch (err) {
    exportError.value = toError(err);
  } finally {
    exportingRunId.value = null;
  }
}

async function exportOutline() {
  if (!projectId.value) {
    return;
  }
  exportPath.value = null;
  isExportingOutline.value = true;
  exportError.value = null;
  try {
    await markExportStage();
    const result = await appStore.exportOutline(projectId.value);
    exportPath.value = result.path;
  } catch (err) {
    exportError.value = toError(err);
  } finally {
    isExportingOutline.value = false;
  }
}

async function revealExport() {
  if (!exportPath.value) {
    return;
  }
  isRevealing.value = true;
  exportError.value = null;
  try {
    await invoke("audio_reveal_wav", { path: exportPath.value });
  } catch (err) {
    exportError.value = toError(err);
  } finally {
    isRevealing.value = false;
  }
}

async function loadData() {
  error.value = null;
  isLoading.value = true;
  try {
    await appStore.bootstrap();
    await appStore.loadProjects();
    if (!projectId.value) {
      throw new Error("project_missing");
    }
    report.value = await appStore.getQuestReport(projectId.value);
    runs.value = await appStore.getRuns(projectId.value, 12);
    peerReviews.value = await appStore.getPeerReviews(projectId.value, 12);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
}

async function setActive() {
  if (!projectId.value) {
    return;
  }
  isActivating.value = true;
  error.value = null;
  try {
    await appStore.setActiveProject(projectId.value);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isActivating.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <section class="space-y-6">
    <TalkStepTabs v-if="projectId" :project-id="projectId" active="export" />

    <div class="app-surface rounded-2xl border p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("talk_steps.export") }}</div>
          <div class="app-text mt-2 text-lg font-semibold">{{ project?.title || t("talk_report.unknown") }}</div>
          <div v-if="talkNumber" class="app-muted mt-1 text-xs">T{{ talkNumber }}</div>
          <div v-if="project" class="app-muted text-xs">
            {{ t("talk_report.duration") }}:
            {{ project.duration_target_sec ? Math.round(project.duration_target_sec / 60) : "--" }}
            {{ t("talk_report.minutes") }}
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <RouterLink class="app-link underline" to="/talks">{{ t("talk_report.back") }}</RouterLink>
            <RouterLink class="app-link underline" :to="`/talks/${projectId}/train`">
              {{ t("talk_steps.train") }}
            </RouterLink>
            <RouterLink class="app-link underline" :to="`/talks/${projectId}/builder`">
              {{ t("talk_report.builder") }}
            </RouterLink>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="isActive"
            class="app-pill app-pill-active rounded-full px-3 py-1 text-[11px] font-semibold"
          >
            {{ t("talk_report.active") }}
          </span>
          <button
            v-else
            class="app-button-secondary cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isActivating"
            @click="setActive"
          >
            {{ t("talk_report.set_active") }}
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="app-muted mt-4 text-xs">{{ t("talk_report.loading") }}</div>
      <div v-else-if="error" class="app-danger-text mt-4 text-xs">{{ error }}</div>
      <div v-else class="mt-4 grid gap-3 text-xs md:grid-cols-4">
        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">{{ t("talk_report.total") }}</div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.total }}</div>
        </div>
        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">{{ t("talk_report.started") }}</div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.started }}</div>
        </div>
        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">{{ t("talk_report.feedback") }}</div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.feedbackCount }}</div>
        </div>
        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">{{ t("talk_report.last_activity") }}</div>
          <div class="app-text mt-1 text-sm font-semibold">{{ formatDate(summary.last) }}</div>
        </div>
      </div>
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("builder.export") }}</div>
      <p class="app-muted mt-2 text-sm">{{ t("builder.subtitle") }}</p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button
          class="app-button-secondary app-focus-ring inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
          type="button"
          :disabled="isExportingOutline"
          @click="exportOutline"
        >
          {{ t("builder.export") }}
        </button>
        <RouterLink class="app-link text-xs underline" :to="`/talks/${projectId}/builder`">
          {{ t("talk_report.builder") }}
        </RouterLink>
      </div>
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("talk_report.export_title") }}</div>
      <div v-if="runs.length === 0" class="app-muted mt-3 text-sm">{{ t("boss_run.latest_empty") }}</div>
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
      <div v-if="exportError" class="app-danger-text mt-2 text-xs">{{ exportError }}</div>
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("talk_report.packs") }}</div>
      <div v-if="peerReviews.length === 0" class="app-muted mt-3 text-sm">{{ t("talk_report.timeline_empty") }}</div>
      <div v-else class="mt-3 space-y-2 text-xs">
        <div
          v-for="review in peerReviews"
          :key="review.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
        >
          <div>
            <div class="app-text text-sm">{{ t("talk_report.timeline_peer_review") }}</div>
            <div class="app-muted text-[11px]">
              {{ formatDate(review.created_at) }}
              <span v-if="review.reviewer_tag"> · {{ review.reviewer_tag }}</span>
            </div>
          </div>
          <RouterLink class="app-link text-xs underline" :to="`/peer-review/${review.id}?projectId=${projectId}`">
            {{ t("talk_report.view_item") }}
          </RouterLink>
        </div>
      </div>
      <div class="mt-3">
        <RouterLink
          class="app-button-secondary app-focus-ring inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold"
          to="/packs"
          @click="markExportStage"
        >
          {{ t("talk_report.packs") }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>
