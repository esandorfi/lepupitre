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
import {
  clearRuntimeUiError,
  normalizeRuntimeError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";
import {
  loadTalkArtifactsWithAttempts,
  loadTalkPageData,
} from "@/features/talks/composables/shared/talkRuntimeDataLoader";

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
    errorCategory?: Ref<RuntimeErrorCategory | null>;
    isLoading: Ref<boolean>;
    isActivating: Ref<boolean>;
    exportPath: Ref<string | null>;
    exportingRunId: Ref<string | null>;
    isRevealing: Ref<boolean>;
    exportError: Ref<string | null>;
    exportErrorCategory?: Ref<RuntimeErrorCategory | null>;
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
  // Policy: loadReport uses takeLatest to avoid stale report writes.
  let loadSequence = 0;
  // Policy: setActive uses singleFlight to dedupe repeated activation clicks.
  let setActiveInFlight: Promise<void> | null = null;

  async function exportPack(runId: string) {
    ui.exportPath.value = null;
    ui.exportingRunId.value = runId;
    ui.exportError.value = null;
    if (ui.exportErrorCategory) {
      ui.exportErrorCategory.value = null;
    }
    try {
      const result = await deps.exportPack(runId);
      ui.exportPath.value = result.path;
    } catch (err) {
      const normalized = normalizeRuntimeError(err);
      ui.exportError.value = normalized.message;
      if (ui.exportErrorCategory) {
        ui.exportErrorCategory.value = normalized.category;
      }
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
    if (ui.exportErrorCategory) {
      ui.exportErrorCategory.value = null;
    }
    try {
      await deps.revealPath(ui.exportPath.value);
    } catch (err) {
      const normalized = normalizeRuntimeError(err);
      ui.exportError.value = normalized.message;
      if (ui.exportErrorCategory) {
        ui.exportErrorCategory.value = normalized.category;
      }
    } finally {
      ui.isRevealing.value = false;
    }
  }

  async function loadReport() {
    const requestId = ++loadSequence;
    clearRuntimeUiError(ui);
    ui.isLoading.value = true;
    try {
      const artifacts = await loadTalkPageData({
        bootstrapSession: deps.bootstrapSession,
        loadProjects: deps.loadProjects,
        projectId: identity.projectId.value,
        isStale: () => requestId !== loadSequence,
        onProjectMissing: (runtimeUi) => {
          runtimeUi.error.value = "project_missing";
          if (ui.errorCategory) {
            ui.errorCategory.value = "validation";
          }
        },
        ui,
        loadArtifacts: (projectId) => loadTalkArtifactsWithAttempts(deps, projectId),
      });
      if (!artifacts) {
        return;
      }
      model.report.value = artifacts.report;
      model.attempts.value = artifacts.attempts;
      model.runs.value = artifacts.runs;
      model.peerReviews.value = artifacts.peerReviews;
    } catch (err) {
      if (requestId !== loadSequence) {
        return;
      }
      setRuntimeUiError(ui, err);
    } finally {
      if (requestId === loadSequence) {
        ui.isLoading.value = false;
      }
    }
  }

  async function setActive() {
    if (setActiveInFlight) {
      return setActiveInFlight;
    }
    if (!identity.projectId.value) {
      return;
    }
    const run = (async () => {
      ui.isActivating.value = true;
      clearRuntimeUiError(ui);
      try {
        await deps.setActiveProject(identity.projectId.value);
      } catch (err) {
        setRuntimeUiError(ui, err);
      } finally {
        ui.isActivating.value = false;
      }
    })();
    setActiveInFlight = run;
    await run.finally(() => {
      if (setActiveInFlight === run) {
        setActiveInFlight = null;
      }
    });
  }

  return {
    exportPack,
    revealExport,
    loadReport,
    setActive,
  };
}
