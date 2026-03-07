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

type TalkTrainRuntimeArgs = {
  projectId: Ref<string>;
  error: Ref<string | null>;
  isLoading: Ref<boolean>;
  isActivating: Ref<boolean>;
  report: Ref<QuestReportItem[]>;
  attempts: Ref<QuestAttemptSummary[]>;
  runs: Ref<RunSummary[]>;
  peerReviews: Ref<PeerReviewSummary[]>;
};

export function createTalkTrainRuntime(args: TalkTrainRuntimeArgs) {
  const {
    projectId,
    error,
    isLoading,
    isActivating,
    report,
    attempts,
    runs,
    peerReviews,
  } = args;

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

  async function markTrainStage() {
    if (!projectId.value) {
      return;
    }
    try {
      await talksStore.ensureProjectStageAtLeast(projectId.value, "train");
    } catch {
      // non-blocking UI progression hint
    }
  }

  return { loadData, setActive, markTrainStage };
}
