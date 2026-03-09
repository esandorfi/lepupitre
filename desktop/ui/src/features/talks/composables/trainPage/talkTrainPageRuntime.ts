import type { Ref } from "vue";
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
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";
import {
  loadTalkArtifactsWithAttempts,
  loadTalkPageData,
} from "@/features/talks/composables/shared/talkRuntimeDataLoader";

export type TalkTrainRuntimeState = {
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
  };
};

export type TalkTrainRuntimeDeps = {
  bootstrapSession: () => Promise<void>;
  loadProjects: () => Promise<void>;
  getQuestReport: (projectId: string) => Promise<QuestReportItem[]>;
  getQuestAttempts: (projectId: string, limit: number) => Promise<QuestAttemptSummary[]>;
  getRuns: (projectId: string, limit: number) => Promise<RunSummary[]>;
  getPeerReviews: (projectId: string, limit: number) => Promise<PeerReviewSummary[]>;
  setActiveProject: (projectId: string) => Promise<void>;
  ensureProjectStageAtLeast: (
    projectId: string,
    stage: "draft" | "builder" | "train" | "export"
  ) => Promise<void>;
};

function createDefaultTalkTrainRuntimeDeps(): TalkTrainRuntimeDeps {
  return {
    bootstrapSession: () => sessionStore.bootstrap(),
    loadProjects: () => talksStore.loadProjects(),
    getQuestReport: (projectId) => trainingStore.getQuestReport(projectId),
    getQuestAttempts: (projectId, limit) => trainingStore.getQuestAttempts(projectId, limit),
    getRuns: (projectId, limit) => runStore.getRuns(projectId, limit),
    getPeerReviews: (projectId, limit) => packStore.getPeerReviews(projectId, limit),
    setActiveProject: (projectId) => talksStore.setActiveProject(projectId),
    ensureProjectStageAtLeast: (projectId, stage) =>
      talksStore.ensureProjectStageAtLeast(projectId, stage),
  };
}

type TalkTrainRuntimeArgs = {
  state: TalkTrainRuntimeState;
  deps?: TalkTrainRuntimeDeps;
};

export function createTalkTrainRuntime(args: TalkTrainRuntimeArgs) {
  const deps = args.deps ?? createDefaultTalkTrainRuntimeDeps();
  const { identity, model, ui } = args.state;
  // Policy: loadData uses takeLatest to prevent stale load overrides.
  let loadSequence = 0;
  // Policy: setActive uses singleFlight to dedupe rapid repeated clicks.
  let setActiveInFlight: Promise<void> | null = null;

  async function loadData() {
    const requestId = ++loadSequence;
    clearRuntimeUiError(ui);
    ui.isLoading.value = true;
    try {
      // Shared loader enforces a single bootstrap/project-guard flow across talks pages.
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

  async function markTrainStage() {
    if (!identity.projectId.value) {
      return;
    }
    try {
      await deps.ensureProjectStageAtLeast(identity.projectId.value, "train");
    } catch {
      // Stage progression is advisory here; training data should still be available.
    }
  }

  return { loadData, setActive, markTrainStage };
}
