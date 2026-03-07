import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { audioRevealWav } from "@/domains/recorder/api";
import { useI18n } from "@/lib/i18n";
import type { PeerReviewSummary, QuestReportItem, RunSummary } from "@/schemas/ipc";
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

export function useTalkExportPageState() {
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

  const project = computed(() => appState.projects.find((item) => item.id === projectId.value) ?? null);
  const isActive = computed(() => appState.activeProject?.id === projectId.value);
  const talkNumber = computed(() => project.value?.talk_number ?? null);
  const summary = computed(() => buildSummary(report.value));

  async function markExportStage() {
    if (!projectId.value) {
      return;
    }
    try {
      await talksStore.ensureProjectStageAtLeast(projectId.value, "export");
    } catch {
      // keep export actions non-blocking
    }
  }

  async function exportPack(runId: string) {
    exportPath.value = null;
    exportingRunId.value = runId;
    exportError.value = null;
    try {
      await markExportStage();
      const result = await packStore.exportPack(runId);
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
      const result = await talksStore.exportOutline(projectId.value);
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
      await audioRevealWav(exportPath.value);
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
      await sessionStore.bootstrap();
      await talksStore.loadProjects();
      if (!projectId.value) {
        throw new Error("project_missing");
      }
      report.value = await trainingStore.getQuestReport(projectId.value);
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
    void loadData();
  });

  return {
    t,
    projectId,
    error,
    isLoading,
    isActivating,
    runs,
    peerReviews,
    exportPath,
    exportingRunId,
    isExportingOutline,
    isRevealing,
    exportError,
    project,
    isActive,
    talkNumber,
    summary,
    formatDate,
    runStatus: (run: RunSummary) => runStatus(t, run),
    exportPack,
    exportOutline,
    revealExport,
    setActive,
    markExportStage,
  };
}
