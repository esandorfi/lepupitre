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

export type TalkReportRuntimeState = {
  identity: {
    projectId: Ref<string>;
  };
  model: {
    report: Ref<QuestReportItem[]>;
    attempts: Ref<QuestAttemptSummary[]>;
    runs: Ref<RunSummary[]>;
    peerReviews: Ref<PeerReviewSummary[]>;
  };
  ui: {
    error: Ref<string | null>;
    isLoading: Ref<boolean>;
    isActivating: Ref<boolean>;
    exportPath: Ref<string | null>;
    exportingRunId: Ref<string | null>;
    isRevealing: Ref<boolean>;
    exportError: Ref<string | null>;
  };
};

export type TalkReportRuntimeDeps = {
  revealPath: (path: string) => Promise<void>;
  exportPack: (runId: string) => Promise<{ path: string }>;
  bootstrapSession: () => Promise<void>;
  loadProjects: () => Promise<void>;
  getQuestReport: (projectId: string) => Promise<QuestReportItem[]>;
  getQuestAttempts: (projectId: string, limit: number) => Promise<QuestAttemptSummary[]>;
  getRuns: (projectId: string, limit: number) => Promise<RunSummary[]>;
  getPeerReviews: (projectId: string, limit: number) => Promise<PeerReviewSummary[]>;
  setActiveProject: (projectId: string) => Promise<void>;
};

function createDefaultTalkReportRuntimeDeps(): TalkReportRuntimeDeps {
  return {
    revealPath: (path) => audioRevealWav(path),
    exportPack: (runId) => packStore.exportPack(runId),
    bootstrapSession: () => sessionStore.bootstrap(),
    loadProjects: () => talksStore.loadProjects(),
    getQuestReport: (projectId) => trainingStore.getQuestReport(projectId),
    getQuestAttempts: (projectId, limit) => trainingStore.getQuestAttempts(projectId, limit),
    getRuns: (projectId, limit) => runStore.getRuns(projectId, limit),
    getPeerReviews: (projectId, limit) => packStore.getPeerReviews(projectId, limit),
    setActiveProject: (projectId) => talksStore.setActiveProject(projectId),
  };
}

type TalkReportRuntimeArgs = {
  state: TalkReportRuntimeState;
  deps?: TalkReportRuntimeDeps;
};

export function createTalkReportRuntime(args: TalkReportRuntimeArgs) {
  const deps = args.deps ?? createDefaultTalkReportRuntimeDeps();
  const { identity, model, ui } = args.state;
  let loadSequence = 0;

  async function exportPack(runId: string) {
    ui.exportPath.value = null;
    ui.exportingRunId.value = runId;
    ui.exportError.value = null;
    try {
      const result = await deps.exportPack(runId);
      ui.exportPath.value = result.path;
    } catch (err) {
      ui.exportError.value = toError(err);
    } finally {
      ui.exportingRunId.value = null;
    }
  }

  async function revealExport() {
    if (!ui.exportPath.value) {
      return;
    }
    ui.isRevealing.value = true;
    ui.exportError.value = null;
    try {
      await deps.revealPath(ui.exportPath.value);
    } catch (err) {
      ui.exportError.value = toError(err);
    } finally {
      ui.isRevealing.value = false;
    }
  }

  async function loadReport() {
    const requestId = ++loadSequence;
    ui.error.value = null;
    ui.isLoading.value = true;
    try {
      await deps.bootstrapSession();
      if (requestId !== loadSequence) {
        return;
      }
      await deps.loadProjects();
      if (requestId !== loadSequence) {
        return;
      }
      if (!identity.projectId.value) {
        throw new Error("project_missing");
      }
      model.report.value = await deps.getQuestReport(identity.projectId.value);
      if (requestId !== loadSequence) {
        return;
      }
      model.attempts.value = await deps.getQuestAttempts(identity.projectId.value, 12);
      if (requestId !== loadSequence) {
        return;
      }
      model.runs.value = await deps.getRuns(identity.projectId.value, 12);
      if (requestId !== loadSequence) {
        return;
      }
      model.peerReviews.value = await deps.getPeerReviews(identity.projectId.value, 12);
    } catch (err) {
      if (requestId !== loadSequence) {
        return;
      }
      ui.error.value = toError(err);
    } finally {
      if (requestId === loadSequence) {
        ui.isLoading.value = false;
      }
    }
  }

  async function setActive() {
    if (!identity.projectId.value) {
      return;
    }
    ui.isActivating.value = true;
    ui.error.value = null;
    try {
      await deps.setActiveProject(identity.projectId.value);
    } catch (err) {
      ui.error.value = toError(err);
    } finally {
      ui.isActivating.value = false;
    }
  }

  return {
    exportPack,
    revealExport,
    loadReport,
    setActive,
  };
}
