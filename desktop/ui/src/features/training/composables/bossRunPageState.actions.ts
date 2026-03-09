import type { Ref } from "vue";
import { runStore, sessionStore } from "@/stores/app";
import type { RunSummary } from "@/schemas/ipc";
import {
  clearRuntimeUiError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";

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
    errorCategory?: Ref<RuntimeErrorCategory | null>;
    isLoading: Ref<boolean>;
    isSaving: Ref<boolean>;
    isAnalyzing: Ref<boolean>;
  };
};

export type BossRunActionsDeps = {
  t: (key: string) => string;
  bootstrapSession: () => Promise<void>;
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
    bootstrapSession: () => sessionStore.bootstrap(),
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

/**
 * Creates and returns the create boss run actions contract.
 */
export function createBossRunActions(args: BossRunActionsArgs) {
  const deps = args.deps ?? createDefaultBossRunActionsDeps(args.t, args.routerPush);
  const { identity, model, ui } = args.state;
  // Policy: loadLatest uses takeLatest, save/analyze use singleFlight.
  let loadSequence = 0;
  let saveInFlight: Promise<void> | null = null;
  let analyzeInFlight: Promise<void> | null = null;

  async function bootstrap() {
    try {
      await deps.bootstrapSession();
    } catch (err) {
      setRuntimeUiError(ui, err);
    }
  }

  async function loadLatest() {
    const requestId = ++loadSequence;
    model.run.value = null;
    if (!identity.activeProjectId.value) {
      return;
    }
    ui.isLoading.value = true;
    clearRuntimeUiError(ui);
    try {
      if (identity.requestedRunId.value) {
        model.run.value = await deps.getRun(identity.requestedRunId.value);
        if (requestId !== loadSequence) {
          return;
        }
        if (!model.run.value) {
          model.run.value = await deps.getLatestRun(identity.activeProjectId.value);
        }
      } else {
        model.run.value = await deps.getLatestRun(identity.activeProjectId.value);
      }
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

  async function handleAudioSaved(payload: { artifactId: string }) {
    if (saveInFlight) {
      return saveInFlight;
    }
    const activeProjectId = identity.activeProjectId.value;
    if (!activeProjectId) {
      ui.error.value = deps.t("boss_run.need_talk");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    model.pendingTranscriptId.value = null;
    const run = (async () => {
      ui.isSaving.value = true;
      clearRuntimeUiError(ui);
      try {
        const runId = await deps.createRun(activeProjectId);
        await deps.finishRun(runId, payload.artifactId);
        if (model.pendingTranscriptId.value) {
          await deps.setRunTranscript(runId, model.pendingTranscriptId.value);
          model.pendingTranscriptId.value = null;
        }
        model.run.value = await deps.getLatestRun(activeProjectId);
      } catch (err) {
        setRuntimeUiError(ui, err);
      } finally {
        ui.isSaving.value = false;
      }
    })();
    saveInFlight = run;
    await run.finally(() => {
      if (saveInFlight === run) {
        saveInFlight = null;
      }
    });
  }

  async function handleTranscribed(payload: { transcriptId: string }) {
    const activeProjectId = identity.activeProjectId.value;
    if (!activeProjectId) {
      ui.error.value = deps.t("boss_run.need_talk");
      return;
    }
    if (!model.run.value) {
      model.pendingTranscriptId.value = payload.transcriptId;
      return;
    }
    clearRuntimeUiError(ui);
    try {
      await deps.setRunTranscript(model.run.value.id, payload.transcriptId);
      model.run.value = await deps.getLatestRun(activeProjectId);
    } catch (err) {
      setRuntimeUiError(ui, err);
    }
  }

  async function requestFeedback() {
    if (analyzeInFlight) {
      return analyzeInFlight;
    }
    if (!model.run.value) {
      ui.error.value = deps.t("boss_run.run_missing");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    const runId = model.run.value.id;
    const run = (async () => {
      ui.isAnalyzing.value = true;
      clearRuntimeUiError(ui);
      try {
        const feedbackId = await deps.analyzeRun(runId);
        await deps.routerPush(`/feedback?focus=${feedbackId}&source=boss-run`);
      } catch (err) {
        setRuntimeUiError(ui, err);
      } finally {
        ui.isAnalyzing.value = false;
      }
    })();
    analyzeInFlight = run;
    await run.finally(() => {
      if (analyzeInFlight === run) {
        analyzeInFlight = null;
      }
    });
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
    bootstrap,
    loadLatest,
    handleAudioSaved,
    handleTranscribed,
    requestFeedback,
    handleRecorderAnalyze,
    handleViewFeedback,
  };
}
