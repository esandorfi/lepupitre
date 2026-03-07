import type { Ref } from "vue";
import { runStore } from "@/stores/app";
import type { RunSummary } from "@/schemas/ipc";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export type BossRunActionsState = {
  identity: {
    activeProjectId: Ref<string | undefined>;
    requestedRunId: Ref<string>;
  };
  model: {
    run: Ref<RunSummary | null>;
    pendingTranscriptId: Ref<string | null>;
  };
  ui: {
    error: Ref<string | null>;
    isLoading: Ref<boolean>;
    isSaving: Ref<boolean>;
    isAnalyzing: Ref<boolean>;
  };
};

export type BossRunActionsDeps = {
  t: (key: string) => string;
  getRun: (runId: string) => Promise<RunSummary | null>;
  getLatestRun: (projectId: string) => Promise<RunSummary | null>;
  createRun: (projectId: string) => Promise<string>;
  finishRun: (runId: string, artifactId: string) => Promise<void>;
  setRunTranscript: (runId: string, transcriptId: string) => Promise<void>;
  analyzeRun: (runId: string) => Promise<string>;
  routerPush: (path: string) => Promise<void>;
};

function createDefaultBossRunActionsDeps(
  t: (key: string) => string,
  routerPush: (path: string) => Promise<void>
): BossRunActionsDeps {
  return {
    t,
    getRun: (runId) => runStore.getRun(runId),
    getLatestRun: (projectId) => runStore.getLatestRun(projectId),
    createRun: (projectId) => runStore.createRun(projectId),
    finishRun: (runId, artifactId) => runStore.finishRun(runId, artifactId),
    setRunTranscript: (runId, transcriptId) => runStore.setRunTranscript(runId, transcriptId),
    analyzeRun: (runId) => runStore.analyzeRun(runId),
    routerPush,
  };
}

type BossRunActionsArgs = {
  state: BossRunActionsState;
  t: (key: string) => string;
  routerPush: (path: string) => Promise<void>;
  deps?: BossRunActionsDeps;
};

export function createBossRunActions(args: BossRunActionsArgs) {
  const deps = args.deps ?? createDefaultBossRunActionsDeps(args.t, args.routerPush);
  const { identity, model, ui } = args.state;

  async function loadLatest() {
    model.run.value = null;
    if (!identity.activeProjectId.value) {
      return;
    }
    ui.isLoading.value = true;
    ui.error.value = null;
    try {
      if (identity.requestedRunId.value) {
        model.run.value = await deps.getRun(identity.requestedRunId.value);
        if (!model.run.value) {
          model.run.value = await deps.getLatestRun(identity.activeProjectId.value);
        }
      } else {
        model.run.value = await deps.getLatestRun(identity.activeProjectId.value);
      }
    } catch (err) {
      ui.error.value = toError(err);
    } finally {
      ui.isLoading.value = false;
    }
  }

  async function handleAudioSaved(payload: { artifactId: string }) {
    if (!identity.activeProjectId.value) {
      ui.error.value = deps.t("boss_run.need_talk");
      return;
    }
    model.pendingTranscriptId.value = null;
    ui.isSaving.value = true;
    ui.error.value = null;
    try {
      const runId = await deps.createRun(identity.activeProjectId.value);
      await deps.finishRun(runId, payload.artifactId);
      if (model.pendingTranscriptId.value) {
        await deps.setRunTranscript(runId, model.pendingTranscriptId.value);
        model.pendingTranscriptId.value = null;
      }
      model.run.value = await deps.getLatestRun(identity.activeProjectId.value);
    } catch (err) {
      ui.error.value = toError(err);
    } finally {
      ui.isSaving.value = false;
    }
  }

  async function handleTranscribed(payload: { transcriptId: string }) {
    if (!identity.activeProjectId.value) {
      ui.error.value = deps.t("boss_run.need_talk");
      return;
    }
    if (!model.run.value) {
      model.pendingTranscriptId.value = payload.transcriptId;
      return;
    }
    ui.error.value = null;
    try {
      await deps.setRunTranscript(model.run.value.id, payload.transcriptId);
      model.run.value = await deps.getLatestRun(identity.activeProjectId.value);
    } catch (err) {
      ui.error.value = toError(err);
    }
  }

  async function requestFeedback() {
    if (!model.run.value) {
      ui.error.value = deps.t("boss_run.run_missing");
      return;
    }
    ui.isAnalyzing.value = true;
    ui.error.value = null;
    try {
      const feedbackId = await deps.analyzeRun(model.run.value.id);
      await deps.routerPush(`/feedback?focus=${feedbackId}&source=boss-run`);
    } catch (err) {
      ui.error.value = toError(err);
    } finally {
      ui.isAnalyzing.value = false;
    }
  }

  function handleRecorderAnalyze() {
    void requestFeedback();
  }

  function handleViewFeedback() {
    if (model.run.value?.feedback_id) {
      void deps.routerPush(`/feedback/${model.run.value.feedback_id}`);
    }
  }

  return {
    loadLatest,
    handleAudioSaved,
    handleTranscribed,
    requestFeedback,
    handleRecorderAnalyze,
    handleViewFeedback,
  };
}
