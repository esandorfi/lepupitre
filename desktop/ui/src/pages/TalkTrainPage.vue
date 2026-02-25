<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import TalkStepPageShell from "../components/TalkStepPageShell.vue";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "../schemas/ipc";

const { t } = useI18n();
const route = useRoute();
const projectId = computed(() => String(route.params.projectId || ""));

const error = ref<string | null>(null);
const isLoading = ref(false);
const report = ref<QuestReportItem[]>([]);
const attempts = ref<QuestAttemptSummary[]>([]);
const runs = ref<RunSummary[]>([]);
const peerReviews = ref<PeerReviewSummary[]>([]);
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

  for (const run of runs.value) {
    items.push({
      id: run.id,
      label: t("talk_report.timeline_boss_run"),
      date: run.created_at,
      status: runStatus(run),
      to: `/boss-run?runId=${run.id}`,
    });
  }

  for (const review of peerReviews.value) {
    items.push({
      id: review.id,
      label: t("talk_report.timeline_peer_review"),
      date: review.created_at,
      status: t("talk_report.timeline_peer_review_status"),
      to: `/peer-review/${review.id}?projectId=${projectId.value}`,
      meta: review.reviewer_tag ?? undefined,
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
  return { total, started, feedbackCount, last };
});

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
    attempts.value = await appStore.getQuestAttempts(projectId.value, 12);
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

async function markTrainStage() {
  if (!projectId.value) {
    return;
  }
  try {
    await appStore.ensureProjectStageAtLeast(projectId.value, "train");
  } catch {
    // non-blocking UI progression hint
  }
}

onMounted(loadData);
</script>

<template>
  <TalkStepPageShell
    :project-id="projectId"
    active="train"
    :eyebrow="t('talk_steps.train')"
    :title="project?.title || t('talk_report.unknown')"
  >
    <template #meta>
      <span v-if="talkNumber">T{{ talkNumber }}</span>
      <span v-if="project">
        {{ t("talk_report.duration") }}:
        {{ project.duration_target_sec ? Math.round(project.duration_target_sec / 60) : "--" }}
        {{ t("talk_report.minutes") }}
      </span>
      <RouterLink class="app-link underline" to="/talks">{{ t("talk_report.back") }}</RouterLink>
      <RouterLink class="app-link underline" :to="`/talks/${projectId}/builder`">
        {{ t("talk_report.builder") }}
      </RouterLink>
      <RouterLink class="app-link underline" :to="`/talks/${projectId}/export`">
        {{ t("talk_steps.export") }}
      </RouterLink>
    </template>
    <template #actions>
      <span
        v-if="isActive"
        class="app-pill app-pill-active app-text-meta inline-flex items-center rounded-full px-3 py-1 font-semibold"
      >
        {{ t("talk_report.active") }}
      </span>
      <button
        v-else
        class="app-button-secondary app-focus-ring app-button-sm inline-flex items-center disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="isActivating"
        @click="setActive"
      >
        {{ t("talk_report.set_active") }}
      </button>
    </template>

    <div class="app-panel">
      <div v-if="isLoading" class="app-muted app-text-meta">{{ t("talk_report.loading") }}</div>
      <div v-else-if="error" class="app-danger-text app-text-meta">{{ error }}</div>
      <div v-else class="app-data-grid-4 app-text-meta">
        <div class="app-card rounded-xl border p-3">
          <div class="app-text-eyebrow">{{ t("talk_report.total") }}</div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.total }}</div>
        </div>
        <div class="app-card rounded-xl border p-3">
          <div class="app-text-eyebrow">{{ t("talk_report.started") }}</div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.started }}</div>
        </div>
        <div class="app-card rounded-xl border p-3">
          <div class="app-text-eyebrow">{{ t("talk_report.feedback") }}</div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.feedbackCount }}</div>
        </div>
        <div class="app-card rounded-xl border p-3">
          <div class="app-text-eyebrow">{{ t("talk_report.last_activity") }}</div>
          <div class="app-text mt-1 text-sm font-semibold">{{ formatDate(summary.last) }}</div>
        </div>
      </div>
    </div>

    <div class="app-panel">
      <div class="app-text-eyebrow">{{ t("talk_report.boss_run") }}</div>
      <p class="app-muted app-text-body mt-2">{{ t("boss_run.subtitle") }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <RouterLink
          class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center"
          to="/boss-run"
          @click="markTrainStage"
        >
          {{ t("boss_run.title") }}
        </RouterLink>
        <RouterLink
          class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center"
          :to="`/quest/FREE?from=talk&projectId=${projectId}`"
          @click="markTrainStage"
        >
          {{ t("home.prototype_action_free") }}
        </RouterLink>
      </div>
    </div>

    <div class="app-panel">
      <div class="app-text-eyebrow">{{ t("talk_report.quest_library") }}</div>
      <div v-if="report.length === 0" class="app-muted app-text-body mt-3">{{ t("talk_report.no_quests") }}</div>
      <div v-else class="mt-3 space-y-3">
        <div
          v-for="(quest, index) in report"
          :key="quest.quest_code"
          class="app-card app-radius-card border p-3"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="app-text-eyebrow">
                {{ t("talk_report.quest_label") }} {{ index + 1 }} · {{ questCodeLabel(quest.quest_code) }}
              </div>
              <div class="app-text mt-1 text-sm font-semibold">{{ quest.quest_title }}</div>
              <div class="app-muted mt-1 text-xs">{{ quest.quest_prompt }}</div>
            </div>
            <div class="text-right text-xs">
              <div class="app-text">{{ outputLabel(quest.output_type) }}</div>
              <div class="app-muted mt-1">{{ attemptStatus(quest) }}</div>
              <div class="app-muted mt-1">{{ formatDate(quest.attempt_created_at) }}</div>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <RouterLink
              class="app-button-info app-focus-ring app-button-sm inline-flex items-center"
              :to="`/quest/${quest.quest_code}?from=talk&projectId=${projectId}`"
              @click="markTrainStage"
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

    <div class="app-panel">
      <div class="app-text-eyebrow">{{ t("talk_report.timeline") }}</div>
      <div v-if="timeline.length === 0" class="app-muted app-text-body mt-3">{{ t("talk_report.timeline_empty") }}</div>
      <div v-else class="mt-3 space-y-2 app-text-meta">
        <div
          v-for="item in timeline"
          :key="item.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
        >
          <div>
            <div class="app-text text-sm">{{ item.label }}</div>
            <div class="app-muted app-text-meta">
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
  </TalkStepPageShell>
</template>
