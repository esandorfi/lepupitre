import type { Ref } from "vue";
import { appState, feedbackStore, sessionStore, trainingStore } from "@/stores/app";
import type { Quest } from "@/schemas/ipc";
import {
  clearRuntimeUiError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";

export type QuestActionsState = {
  identity: {
    questCode: Ref<string>;
    contextProjectId: Ref<string>;
    backLink: Ref<string>;
    isAudioQuest: Ref<boolean>;
  };
  model: {
    quest: Ref<Quest | null>;
    attemptId: Ref<string | null>;
    audioArtifactId: Ref<string | null>;
    transcriptId: Ref<string | null>;
    text: Ref<string>;
    submittedTextSnapshot: Ref<string | null>;
  };
  ui: {
    error: Ref<string | null>;
    errorCategory?: Ref<RuntimeErrorCategory | null>;
    isSubmitting: Ref<boolean>;
    isAnalyzing: Ref<boolean>;
    isLoading: Ref<boolean>;
  };
};

export type QuestActionsDeps = {
  t: (key: string) => string;
  bootstrapSession: () => Promise<void>;
  getActiveProfileId: () => string | null;
  getDailyQuestCode: () => string | null;
  getDailyQuestQuest: () => Quest | null;
  getQuestByCode: (code: string) => Promise<Quest | null>;
  submitQuestTextForProject: (
    projectId: string,
    questCode: string,
    text: string
  ) => Promise<string>;
  submitQuestAudioForProject: (
    projectId: string,
    payload: { questCode: string; audioArtifactId: string; transcriptId: string | null }
  ) => Promise<string>;
  analyzeAttempt: (attemptId: string) => Promise<string>;
  routerPush: (path: string) => Promise<void>;
};

function createDefaultQuestActionsDeps(
  t: (key: string) => string,
  routerPush: (path: string) => Promise<void>
): QuestActionsDeps {
  return {
    t,
    bootstrapSession: () => sessionStore.bootstrap(),
    getActiveProfileId: () => appState.activeProfileId,
    getDailyQuestCode: () => appState.dailyQuest?.quest.code ?? null,
    getDailyQuestQuest: () => appState.dailyQuest?.quest ?? null,
    getQuestByCode: (code) => trainingStore.getQuestByCode(code),
    submitQuestTextForProject: (projectId, questCode, text) =>
      trainingStore.submitQuestTextForProject(projectId, questCode, text),
    submitQuestAudioForProject: (projectId, payload) =>
      trainingStore.submitQuestAudioForProject(projectId, payload),
    analyzeAttempt: (attemptId) => feedbackStore.analyzeAttempt(attemptId),
    routerPush,
  };
}

type QuestActionsArgs = {
  state: QuestActionsState;
  t: (key: string) => string;
  routerPush: (path: string) => Promise<void>;
  deps?: QuestActionsDeps;
};

type QuestActionsContext = {
  deps: QuestActionsDeps;
  state: QuestActionsState;
};

type SingleFlight = {
  current: Promise<void> | null;
};

function setValidationError(
  ui: QuestActionsState["ui"],
  t: (key: string) => string,
  key: string
) {
  ui.error.value = t(key);
  if (ui.errorCategory) {
    ui.errorCategory.value = "validation";
  }
}

function resetQuestState(model: QuestActionsState["model"]) {
  model.quest.value = null;
  model.attemptId.value = null;
  model.audioArtifactId.value = null;
  model.transcriptId.value = null;
  model.text.value = "";
  model.submittedTextSnapshot.value = null;
}

async function runSingleFlight(flight: SingleFlight, task: () => Promise<void>) {
  if (flight.current) {
    await flight.current;
    return;
  }
  const run = task();
  flight.current = run;
  await run.finally(() => {
    if (flight.current === run) {
      flight.current = null;
    }
  });
}

async function loadQuestWithLatestPolicy(
  context: QuestActionsContext,
  policy: {
    nextRequestId: () => number;
    isLatest: (requestId: number) => boolean;
    bootstrap: () => Promise<void>;
  }
) {
  const { deps, state } = context;
  const requestId = policy.nextRequestId();
  clearRuntimeUiError(state.ui);
  resetQuestState(state.model);

  const code = state.identity.questCode.value.trim();
  if (!code) {
    setValidationError(state.ui, deps.t, "quest.empty");
    return;
  }

  state.ui.isLoading.value = true;
  try {
    await policy.bootstrap();
    if (!policy.isLatest(requestId)) {
      return;
    }
    if (!deps.getActiveProfileId() || !state.identity.contextProjectId.value) {
      setValidationError(state.ui, deps.t, "home.quest_empty");
      return;
    }

    if (deps.getDailyQuestCode() === code) {
      state.model.quest.value = deps.getDailyQuestQuest();
    } else {
      state.model.quest.value = await deps.getQuestByCode(code);
    }
  } catch (err) {
    if (!policy.isLatest(requestId)) {
      return;
    }
    setRuntimeUiError(state.ui, err);
  } finally {
    if (policy.isLatest(requestId)) {
      state.ui.isLoading.value = false;
    }
  }
}

async function submitTextAttempt(context: QuestActionsContext) {
  const { deps, state } = context;
  if (!state.model.quest.value) {
    setValidationError(state.ui, deps.t, "quest.empty");
    return;
  }
  if (!state.model.text.value.trim()) {
    setValidationError(state.ui, deps.t, "quest.response_required");
    return;
  }
  const quest = state.model.quest.value;
  if (!quest) {
    setValidationError(state.ui, deps.t, "quest.empty");
    return;
  }

  state.ui.isSubmitting.value = true;
  clearRuntimeUiError(state.ui);
  try {
    const trimmed = state.model.text.value.trim();
    const attempt = await deps.submitQuestTextForProject(
      state.identity.contextProjectId.value,
      quest.code,
      trimmed
    );
    state.model.attemptId.value = attempt;
    state.model.submittedTextSnapshot.value = trimmed;
  } catch (err) {
    setRuntimeUiError(state.ui, err);
  } finally {
    state.ui.isSubmitting.value = false;
  }
}

async function submitAudioAttempt(
  context: QuestActionsContext,
  payload: { artifactId: string; transcriptId: string | null }
) {
  const { deps, state } = context;
  if (!state.model.quest.value) {
    return;
  }
  clearRuntimeUiError(state.ui);
  state.model.audioArtifactId.value = payload.artifactId;
  state.model.transcriptId.value = payload.transcriptId;
  try {
    const attempt = await deps.submitQuestAudioForProject(state.identity.contextProjectId.value, {
      questCode: state.model.quest.value.code,
      audioArtifactId: payload.artifactId,
      transcriptId: payload.transcriptId,
    });
    state.model.attemptId.value = attempt;
  } catch (err) {
    setRuntimeUiError(state.ui, err);
  }
}

async function requestFeedbackForAttempt(context: QuestActionsContext) {
  const { deps, state } = context;
  if (!state.model.attemptId.value) {
    setValidationError(state.ui, deps.t, "quest.empty");
    return;
  }
  if (state.identity.isAudioQuest.value && !state.model.transcriptId.value) {
    setValidationError(state.ui, deps.t, "quest.transcribe_first");
    return;
  }
  const attemptId = state.model.attemptId.value;
  if (!attemptId) {
    return;
  }

  state.ui.isAnalyzing.value = true;
  clearRuntimeUiError(state.ui);
  try {
    const feedbackId = await deps.analyzeAttempt(attemptId);
    await deps.routerPush(`/feedback?focus=${feedbackId}&source=quest`);
  } catch (err) {
    setRuntimeUiError(state.ui, err);
  } finally {
    state.ui.isAnalyzing.value = false;
  }
}

export function createQuestActions(args: QuestActionsArgs) {
  const deps = args.deps ?? createDefaultQuestActionsDeps(args.t, args.routerPush);
  const context: QuestActionsContext = {
    deps,
    state: args.state,
  };
  // Policy: loadQuest uses takeLatest; submit/requestFeedback use singleFlight.
  let loadSequence = 0;
  const submitFlight: SingleFlight = { current: null };
  const feedbackFlight: SingleFlight = { current: null };

  async function loadQuest() {
    await loadQuestWithLatestPolicy(context, {
      nextRequestId: () => ++loadSequence,
      isLatest: (requestId) => requestId === loadSequence,
      bootstrap: () => deps.bootstrapSession(),
    });
  }

  async function submit() {
    await runSingleFlight(submitFlight, async () => {
      await submitTextAttempt(context);
    });
  }

  async function handleAudioSaved(payload: { artifactId: string }) {
    await submitAudioAttempt(context, {
      artifactId: payload.artifactId,
      transcriptId: null,
    });
  }

  async function handleTranscribed(payload: { transcriptId: string }) {
    const artifactId = context.state.model.audioArtifactId.value;
    if (!artifactId) {
      return;
    }
    await submitAudioAttempt(context, {
      artifactId,
      transcriptId: payload.transcriptId,
    });
  }

  async function requestFeedback() {
    await runSingleFlight(feedbackFlight, async () => {
      await requestFeedbackForAttempt(context);
    });
  }

  function handleRecorderAnalyze() {
    void requestFeedback();
  }

  async function skipTranscription() {
    await deps.routerPush(context.state.identity.backLink.value);
  }

  return {
    loadQuest,
    submit,
    handleAudioSaved,
    handleTranscribed,
    requestFeedback,
    handleRecorderAnalyze,
    skipTranscription,
  };
}
