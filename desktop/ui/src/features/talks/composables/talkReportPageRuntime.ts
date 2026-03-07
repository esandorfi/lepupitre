import type { Ref } from "vue";
import { audioRevealWav } from "@/domains/recorder/api";
import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "@/schemas/ipc";
import {
  packStore,
  runStore,
  sessionStore,
  talksStore,
  trainingStore,
} from "@/stores/app";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

type TalkReportRuntimeArgs = {
  projectId: Ref<string>;
  error: Ref<string | null>;
  isLoading: Ref<boolean>;
  isActivating: Ref<boolean>;
  report: Ref<QuestReportItem[]>;
  attempts: Ref<QuestAttemptSummary[]>;
  runs: Ref<RunSummary[]>;
  peerReviews: Ref<PeerReviewSummary[]>;
  exportPath: Ref<string | null>;
  exportingRunId: Ref<string | null>;
  isRevealing: Ref<boolean>;
  exportError: Ref<string | null>;
};

export function createTalkReportRuntime(args: TalkReportRuntimeArgs) {
  const {
    projectId,
    error,
    isLoading,
    isActivating,
    report,
    attempts,
    runs,
    peerReviews,
    exportPath,
    exportingRunId,
    isRevealing,
    exportError,
  } = args;

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

  return {
    exportPack,
    revealExport,
    loadReport,
    setActive,
  };
}
