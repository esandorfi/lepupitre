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
      await deps.bootstrapSession();
      if (requestId !== loadSequence) {
        return;
      }
      await deps.loadProjects();
      if (requestId !== loadSequence) {
        return;
      }
      if (!identity.projectId.value) {
        ui.error.value = "project_missing";
        if (ui.errorCategory) {
          ui.errorCategory.value = "validation";
        }
        return;
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
      // non-blocking UI progression hint
    }
  }

  return { loadData, setActive, markTrainStage };
}
