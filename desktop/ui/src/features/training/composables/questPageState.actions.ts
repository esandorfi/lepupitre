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

export function createQuestActions(args: QuestActionsArgs) {
  const deps = args.deps ?? createDefaultQuestActionsDeps(args.t, args.routerPush);
  const { identity, model, ui } = args.state;
  // Policy: loadQuest uses takeLatest; submit/requestFeedback use singleFlight.
  let loadSequence = 0;
  let submitInFlight: Promise<void> | null = null;
  let feedbackInFlight: Promise<void> | null = null;

  async function bootstrap() {
    await deps.bootstrapSession();
  }

  async function loadQuest() {
    const requestId = ++loadSequence;
    clearRuntimeUiError(ui);
    model.quest.value = null;
    model.attemptId.value = null;
    model.audioArtifactId.value = null;
    model.transcriptId.value = null;
    model.text.value = "";
    model.submittedTextSnapshot.value = null;

    const code = identity.questCode.value.trim();
    if (!code) {
      ui.error.value = deps.t("quest.empty");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }

    ui.isLoading.value = true;
    try {
      await bootstrap();
      if (requestId !== loadSequence) {
        return;
      }
      if (!deps.getActiveProfileId() || !identity.contextProjectId.value) {
        ui.error.value = deps.t("home.quest_empty");
        if (ui.errorCategory) {
          ui.errorCategory.value = "validation";
        }
        return;
      }

      if (deps.getDailyQuestCode() === code) {
        model.quest.value = deps.getDailyQuestQuest();
      } else {
        model.quest.value = await deps.getQuestByCode(code);
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

  async function submit() {
    if (submitInFlight) {
      return submitInFlight;
    }
    if (!model.quest.value) {
      ui.error.value = deps.t("quest.empty");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    if (!model.text.value.trim()) {
      ui.error.value = deps.t("quest.response_required");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    const run = (async () => {
      const quest = model.quest.value;
      if (!quest) {
        ui.error.value = deps.t("quest.empty");
        if (ui.errorCategory) {
          ui.errorCategory.value = "validation";
        }
        return;
      }
      ui.isSubmitting.value = true;
      clearRuntimeUiError(ui);
      try {
        const trimmed = model.text.value.trim();
        const attempt = await deps.submitQuestTextForProject(
          identity.contextProjectId.value,
          quest.code,
          trimmed
        );
        model.attemptId.value = attempt;
        model.submittedTextSnapshot.value = trimmed;
      } catch (err) {
        setRuntimeUiError(ui, err);
      } finally {
        ui.isSubmitting.value = false;
      }
    })();
    submitInFlight = run;
    await run.finally(() => {
      if (submitInFlight === run) {
        submitInFlight = null;
      }
    });
  }

  async function handleAudioSaved(payload: { artifactId: string }) {
    if (!model.quest.value) {
      return;
    }
    clearRuntimeUiError(ui);
    model.transcriptId.value = null;
    model.audioArtifactId.value = payload.artifactId;
    try {
      const attempt = await deps.submitQuestAudioForProject(identity.contextProjectId.value, {
        questCode: model.quest.value.code,
        audioArtifactId: payload.artifactId,
        transcriptId: null,
      });
      model.attemptId.value = attempt;
    } catch (err) {
      setRuntimeUiError(ui, err);
    }
  }

  async function handleTranscribed(payload: { transcriptId: string }) {
    if (!model.quest.value || !model.audioArtifactId.value) {
      return;
    }
    clearRuntimeUiError(ui);
    model.transcriptId.value = payload.transcriptId;
    try {
      const attempt = await deps.submitQuestAudioForProject(identity.contextProjectId.value, {
        questCode: model.quest.value.code,
        audioArtifactId: model.audioArtifactId.value,
        transcriptId: payload.transcriptId,
      });
      model.attemptId.value = attempt;
    } catch (err) {
      setRuntimeUiError(ui, err);
    }
  }

  async function requestFeedback() {
    if (feedbackInFlight) {
      return feedbackInFlight;
    }
    if (!model.attemptId.value) {
      ui.error.value = deps.t("quest.empty");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    if (identity.isAudioQuest.value && !model.transcriptId.value) {
      ui.error.value = deps.t("quest.transcribe_first");
      if (ui.errorCategory) {
        ui.errorCategory.value = "validation";
      }
      return;
    }
    const attemptId = model.attemptId.value;
    if (!attemptId) {
      return;
    }
    const run = (async () => {
      ui.isAnalyzing.value = true;
      clearRuntimeUiError(ui);
      try {
        const feedbackId = await deps.analyzeAttempt(attemptId);
        await deps.routerPush(`/feedback?focus=${feedbackId}&source=quest`);
      } catch (err) {
        setRuntimeUiError(ui, err);
      } finally {
        ui.isAnalyzing.value = false;
      }
    })();
    feedbackInFlight = run;
    await run.finally(() => {
      if (feedbackInFlight === run) {
        feedbackInFlight = null;
      }
    });
  }

  function handleRecorderAnalyze() {
    void requestFeedback();
  }

  async function skipTranscription() {
    await deps.routerPush(identity.backLink.value);
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
