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
import {
  clearRuntimeUiError,
  normalizeRuntimeError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";
import {
  loadTalkArtifactsBase,
  loadTalkPageData,
} from "@/features/talks/composables/shared/talkRuntimeDataLoader";

export type TalkExportRuntimeState = {
  identity: {
    projectId: Ref<string>;
  };
  model: {
    report: Ref<QuestReportItem[]>;
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
    isExportingOutline: Ref<boolean>;
    isRevealing: Ref<boolean>;
    exportError: Ref<string | null>;
    exportErrorCategory?: Ref<RuntimeErrorCategory | null>;
  };
};

export type TalkExportRuntimeDeps = {
  revealPath: (path: string) => Promise<void>;
  exportPack: (runId: string) => Promise<{ path: string }>;
  exportOutline: (projectId: string) => Promise<{ path: string }>;
  bootstrapSession: () => Promise<void>;
  loadProjects: () => Promise<void>;
  getQuestReport: (projectId: string) => Promise<QuestReportItem[]>;
  getRuns: (projectId: string, limit: number) => Promise<RunSummary[]>;
  getPeerReviews: (projectId: string, limit: number) => Promise<PeerReviewSummary[]>;
  setActiveProject: (projectId: string) => Promise<void>;
  ensureProjectStageAtLeast: (
    projectId: string,
    stage: "draft" | "builder" | "train" | "export"
  ) => Promise<void>;
};

function createDefaultTalkExportRuntimeDeps(): TalkExportRuntimeDeps {
  return {
    revealPath: (path) => audioRevealWav(path),
    exportPack: (runId) => packStore.exportPack(runId),
    exportOutline: (projectId) => talksStore.exportOutline(projectId),
    bootstrapSession: () => sessionStore.bootstrap(),
    loadProjects: () => talksStore.loadProjects(),
    getQuestReport: (projectId) => trainingStore.getQuestReport(projectId),
    getRuns: (projectId, limit) => runStore.getRuns(projectId, limit),
    getPeerReviews: (projectId, limit) => packStore.getPeerReviews(projectId, limit),
    setActiveProject: (projectId) => talksStore.setActiveProject(projectId),
    ensureProjectStageAtLeast: (projectId, stage) =>
      talksStore.ensureProjectStageAtLeast(projectId, stage),
  };
}

type TalkExportRuntimeArgs = {
  state: TalkExportRuntimeState;
  deps?: TalkExportRuntimeDeps;
};

/**
 * Creates the export-page runtime command layer.
 * Keeps stage progression advisory while preserving export UX continuity.
 */
export function createTalkExportRuntime(args: TalkExportRuntimeArgs) {
  const deps = args.deps ?? createDefaultTalkExportRuntimeDeps();
  const { identity, model, ui } = args.state;
  // Policy: loadData uses takeLatest to avoid stale writes.
  let loadSequence = 0;
  // Policy: setActive uses singleFlight to dedupe repeated activation calls.
  let setActiveInFlight: Promise<void> | null = null;

  async function markExportStage() {
    if (!identity.projectId.value) {
      return;
    }
    try {
      await deps.ensureProjectStageAtLeast(identity.projectId.value, "export");
    } catch {
      // Stage progression is advisory; file export should not fail because of stage sync.
    }
  }

  async function exportPack(runId: string) {
    ui.exportPath.value = null;
    ui.exportingRunId.value = runId;
    ui.exportError.value = null;
    if (ui.exportErrorCategory) {
      ui.exportErrorCategory.value = null;
    }
    try {
      await markExportStage();
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

  async function exportOutline() {
    if (!identity.projectId.value) {
      return;
    }
    ui.exportPath.value = null;
    ui.isExportingOutline.value = true;
    ui.exportError.value = null;
    if (ui.exportErrorCategory) {
      ui.exportErrorCategory.value = null;
    }
    try {
      await markExportStage();
      const result = await deps.exportOutline(identity.projectId.value);
      ui.exportPath.value = result.path;
    } catch (err) {
      const normalized = normalizeRuntimeError(err);
      ui.exportError.value = normalized.message;
      if (ui.exportErrorCategory) {
        ui.exportErrorCategory.value = normalized.category;
      }
    } finally {
      ui.isExportingOutline.value = false;
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

  async function loadData() {
    const requestId = ++loadSequence;
    clearRuntimeUiError(ui);
    ui.isLoading.value = true;
    try {
      // Shared loader keeps bootstrap/order/stale semantics aligned with train/report pages.
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
        loadArtifacts: (projectId) => loadTalkArtifactsBase(deps, projectId),
      });
      if (!artifacts) {
        return;
      }
      model.report.value = artifacts.report;
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
    markExportStage,
    exportPack,
    exportOutline,
    revealExport,
    loadData,
    setActive,
  };
}
