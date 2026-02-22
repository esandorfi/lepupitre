<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { QuestAttemptSummary, QuestReportItem, RunSummary } from "../schemas/ipc";

const { t } = useI18n();
const route = useRoute();
const projectId = computed(() => String(route.params.projectId || ""));

const error = ref<string | null>(null);
const isLoading = ref(false);
const report = ref<QuestReportItem[]>([]);
const attempts = ref<QuestAttemptSummary[]>([]);
const latestRun = ref<RunSummary | null>(null);
const isActivating = ref(false);

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

function attemptStatus(item: { has_feedback: boolean; has_transcript: boolean; has_audio: boolean }) {
  if (item.has_feedback) {
    return t("quest.status_feedback");
  }
  if (item.has_transcript) {
    return t("quest.status_transcribed");
  }
  if (item.has_audio) {
    return t("quest.status_recorded");
  }
  return t("quest.status_not_started");
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

function outputLabel(outputType: string) {
  const type = outputType.toLowerCase();
  if (type === "audio") {
    return t("quest.output_audio");
  }
  if (type === "text") {
    return t("quest.output_text");
  }
  return outputType;
}

function questCodeLabel(code: string) {
  return appStore.formatQuestCode(projectId.value, code);
}

const timeline = computed(() => {
  const items: {
    id: string;
    label: string;
    date: string;
    status: string;
    to?: string;
    meta?: string;
  }[] = [];

  for (const attempt of attempts.value) {
    items.push({
      id: attempt.id,
      label: attempt.quest_title,
      date: attempt.created_at,
      status: attemptStatus(attempt),
      to: `/quest/${attempt.quest_code}?from=talk&projectId=${projectId.value}`,
      meta: questCodeLabel(attempt.quest_code),
    });
  }

  if (latestRun.value) {
    items.push({
      id: latestRun.value.id,
      label: t("talk_report.timeline_boss_run"),
      date: latestRun.value.created_at,
      status: runStatus(latestRun.value),
      to: `/boss-run?runId=${latestRun.value.id}`,
    });
  }

  items.sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return 0;
    }
    return bTime - aTime;
  });

  return items;
});

const summary = computed(() => {
  const total = report.value.length;
  const started = report.value.filter((item) => item.attempt_id).length;
  const feedbackCount = report.value.filter((item) => item.has_feedback).length;
  const last = report.value
    .map((item) => item.attempt_created_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .pop();
  return {
    total,
    started,
    feedbackCount,
    last,
  };
});

async function loadReport() {
  error.value = null;
  isLoading.value = true;
  try {
    await appStore.bootstrap();
    await appStore.loadProjects();
    if (!projectId.value) {
      throw new Error("project_missing");
    }
    report.value = await appStore.getQuestReport(projectId.value);
    attempts.value = await appStore.getQuestAttempts(projectId.value, 12);
    latestRun.value = await appStore.getLatestRun(projectId.value);
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

onMounted(loadReport);
</script>

<template>
  <section class="space-y-6">
    <div class="app-surface rounded-2xl border p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("talk_report.title") }}
          </div>
          <div class="app-text mt-2 text-lg font-semibold">
            {{ project?.title || t("talk_report.unknown") }}
          </div>
          <div v-if="talkNumber" class="app-muted mt-1 text-xs">T{{ talkNumber }}</div>
          <div v-if="project" class="app-muted text-xs">
            {{ t("talk_report.duration") }}:
            {{ project.duration_target_sec ? Math.round(project.duration_target_sec / 60) : "--" }}
            {{ t("talk_report.minutes") }}
          </div>
          <div class="app-muted mt-1 text-xs">{{ t("talk_report.subtitle") }}</div>
          <div class="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <RouterLink class="app-link underline" to="/talks">
              {{ t("talk_report.back") }}
            </RouterLink>
            <RouterLink class="app-link underline" to="/boss-run">
              {{ t("talk_report.boss_run") }}
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

      <div v-if="isLoading" class="app-muted mt-4 text-xs">
        {{ t("talk_report.loading") }}
      </div>
      <div v-else-if="error" class="app-danger-text mt-4 text-xs">
        {{ error }}
      </div>
      <div v-else class="mt-4 grid gap-3 text-xs md:grid-cols-4">
        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">
            {{ t("talk_report.total") }}
          </div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.total }}</div>
        </div>
        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">
            {{ t("talk_report.started") }}
          </div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.started }}</div>
        </div>
        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">
            {{ t("talk_report.feedback") }}
          </div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.feedbackCount }}</div>
        </div>
        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">
            {{ t("talk_report.last_activity") }}
          </div>
          <div class="app-text mt-1 text-sm font-semibold">
            {{ formatDate(summary.last) }}
          </div>
        </div>
      </div>
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("talk_report.quest_library") }}
      </div>
      <div v-if="report.length === 0" class="app-muted mt-3 text-sm">
        {{ t("talk_report.no_quests") }}
      </div>
      <div v-else class="mt-3 space-y-3">
        <div
          v-for="(quest, index) in report"
          :key="quest.quest_code"
          class="app-card rounded-xl border p-3"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">
                {{ t("talk_report.quest_label") }} {{ index + 1 }} ·
                {{ questCodeLabel(quest.quest_code) }}
              </div>
              <div class="app-text mt-1 text-sm font-semibold">{{ quest.quest_title }}</div>
              <div class="app-muted mt-1 text-xs">{{ quest.quest_prompt }}</div>
            </div>
            <div class="text-right text-xs">
              <div class="app-text">{{ outputLabel(quest.output_type) }}</div>
              <div class="app-muted mt-1">{{ attemptStatus(quest) }}</div>
              <div class="app-muted mt-1">
                {{ formatDate(quest.attempt_created_at) }}
              </div>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <RouterLink
              class="app-button-info inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
              :to="`/quest/${quest.quest_code}?from=talk&projectId=${projectId}`"
            >
              {{ t("talk_report.open_quest") }}
            </RouterLink>
            <RouterLink
              v-if="quest.feedback_id"
              class="app-link text-xs underline"
              :to="`/feedback/${quest.feedback_id}`"
            >
              {{ t("talk_report.view_feedback") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("talk_report.timeline") }}
      </div>
      <div v-if="timeline.length === 0" class="app-muted mt-3 text-sm">
        {{ t("talk_report.timeline_empty") }}
      </div>
      <div v-else class="mt-3 space-y-2 text-xs">
        <div
          v-for="item in timeline"
          :key="item.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
        >
          <div>
            <div class="app-text text-sm">{{ item.label }}</div>
            <div class="app-muted text-[11px]">
              {{ formatDate(item.date) }} · {{ item.status }}
              <span v-if="item.meta">· {{ item.meta }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <RouterLink v-if="item.to" class="app-link text-xs underline" :to="item.to">
              {{ t("talk_report.view_item") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
