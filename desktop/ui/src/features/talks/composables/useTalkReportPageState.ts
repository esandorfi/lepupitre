import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { audioRevealWav } from "@/domains/recorder/api";
import { useI18n } from "@/lib/i18n";
import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "@/schemas/ipc";
import {
  appState,
  packStore,
  runStore,
  sessionStore,
  talksStore,
  trainingStore,
} from "@/stores/app";

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

function attemptStatus(
  t: (key: string) => string,
  item: { has_feedback: boolean; has_transcript: boolean; has_audio: boolean }
) {
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

function runStatus(t: (key: string) => string, run: RunSummary) {
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

function outputLabel(t: (key: string) => string, outputType: string) {
  const type = outputType.toLowerCase();
  if (type === "audio") {
    return t("quest.output_audio");
  }
  if (type === "text") {
    return t("quest.output_text");
  }
  return outputType;
}

type TimelineItem = {
  id: string;
  label: string;
  date: string;
  status: string;
  to?: string;
  meta?: string;
};

function buildTimeline(
  t: (key: string) => string,
  projectId: string,
  attempts: QuestAttemptSummary[],
  runs: RunSummary[],
  peerReviews: PeerReviewSummary[],
  questCodeLabel: (code: string) => string
) {
  const items: TimelineItem[] = [];

  for (const attempt of attempts) {
    items.push({
      id: attempt.id,
      label: attempt.quest_title,
      date: attempt.created_at,
      status: attemptStatus(t, attempt),
      to: `/quest/${attempt.quest_code}?from=talk&projectId=${projectId}`,
      meta: questCodeLabel(attempt.quest_code),
    });
  }

  for (const run of runs) {
    items.push({
      id: run.id,
      label: t("talk_report.timeline_boss_run"),
      date: run.created_at,
      status: runStatus(t, run),
      to: `/boss-run?runId=${run.id}`,
    });
  }

  for (const review of peerReviews) {
    items.push({
      id: review.id,
      label: t("talk_report.timeline_peer_review"),
      date: review.created_at,
      status: t("talk_report.timeline_peer_review_status"),
      to: `/peer-review/${review.id}?projectId=${projectId}`,
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
}

function buildSummary(report: QuestReportItem[]) {
  const total = report.length;
  const started = report.filter((item) => item.attempt_id).length;
  const feedbackCount = report.filter((item) => item.has_feedback).length;
  const last = report
    .map((item) => item.attempt_created_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .pop();
  return { total, started, feedbackCount, last };
}

export function useTalkReportPageState() {
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
  const exportPath = ref<string | null>(null);
  const exportingRunId = ref<string | null>(null);
  const isRevealing = ref(false);
  const exportError = ref<string | null>(null);

  const project = computed(() => appState.projects.find((item) => item.id === projectId.value) ?? null);
  const isActive = computed(() => appState.activeProject?.id === projectId.value);
  const talkNumber = computed(() => project.value?.talk_number ?? null);
  const activeStep = computed<"train" | "export">(() => (route.name === "talk-export" ? "export" : "train"));
  const summary = computed(() => buildSummary(report.value));
  const timeline = computed(() =>
    buildTimeline(
      t,
      projectId.value,
      attempts.value,
      runs.value,
      peerReviews.value,
      (code: string) => trainingStore.formatQuestCode(projectId.value, code)
    )
  );

  async function exportPack(runId: string) {
    exportPath.value = null;
    exportingRunId.value = runId;
    exportError.value = null;
    try {
      const result = await packStore.exportPack(runId);
      exportPath.value = result.path;
    } catch (err) {
      exportError.value = toError(err);
    } finally {
      exportingRunId.value = null;
    }
  }

  async function revealExport() {
    if (!exportPath.value) {
      return;
    }
    isRevealing.value = true;
    exportError.value = null;
    try {
      await audioRevealWav(exportPath.value);
    } catch (err) {
      exportError.value = toError(err);
    } finally {
      isRevealing.value = false;
    }
  }

  async function loadReport() {
    error.value = null;
    isLoading.value = true;
    try {
      await sessionStore.bootstrap();
      await talksStore.loadProjects();
      if (!projectId.value) {
        throw new Error("project_missing");
      }
      report.value = await trainingStore.getQuestReport(projectId.value);
      attempts.value = await trainingStore.getQuestAttempts(projectId.value, 12);
      runs.value = await runStore.getRuns(projectId.value, 12);
      peerReviews.value = await packStore.getPeerReviews(projectId.value, 12);
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
      await talksStore.setActiveProject(projectId.value);
    } catch (err) {
      error.value = toError(err);
    } finally {
      isActivating.value = false;
    }
  }

  onMounted(() => {
    void loadReport();
  });

  return {
    t,
    projectId,
    error,
    isLoading,
    report,
    runs,
    isActivating,
    exportPath,
    exportingRunId,
    isRevealing,
    exportError,
    project,
    isActive,
    talkNumber,
    activeStep,
    summary,
    timeline,
    formatDate,
    attemptStatus: (item: { has_feedback: boolean; has_transcript: boolean; has_audio: boolean }) =>
      attemptStatus(t, item),
    runStatus: (run: RunSummary) => runStatus(t, run),
    outputLabel: (outputType: string) => outputLabel(t, outputType),
    questCodeLabel: (code: string) => trainingStore.formatQuestCode(projectId.value, code),
    exportPack,
    revealExport,
    setActive,
  };
}
