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

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

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
  let loadSequence = 0;

  async function loadData() {
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
