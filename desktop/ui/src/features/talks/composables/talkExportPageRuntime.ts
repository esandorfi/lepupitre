import type { Ref } from "vue";
import { audioRevealWav } from "@/domains/recorder/api";
import type { PeerReviewSummary, QuestReportItem, RunSummary } from "@/schemas/ipc";
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

type TalkExportRuntimeArgs = {
  projectId: Ref<string>;
  error: Ref<string | null>;
  isLoading: Ref<boolean>;
  isActivating: Ref<boolean>;
  report: Ref<QuestReportItem[]>;
  runs: Ref<RunSummary[]>;
  peerReviews: Ref<PeerReviewSummary[]>;
  exportPath: Ref<string | null>;
  exportingRunId: Ref<string | null>;
  isExportingOutline: Ref<boolean>;
  isRevealing: Ref<boolean>;
  exportError: Ref<string | null>;
};

export function createTalkExportRuntime(args: TalkExportRuntimeArgs) {
  const {
    projectId,
    error,
    isLoading,
    isActivating,
    report,
    runs,
    peerReviews,
    exportPath,
    exportingRunId,
    isExportingOutline,
    isRevealing,
    exportError,
  } = args;

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

  return {
    markExportStage,
    exportPack,
    exportOutline,
    revealExport,
    loadData,
    setActive,
  };
}
