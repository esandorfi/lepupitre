import type { Ref } from "vue";
import { appState, feedbackStore, sessionStore, trainingStore } from "@/stores/app";
import type { QuestRefs } from "@/features/training/composables/questPageState.refs";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

type QuestActionsArgs = {
  t: (key: string) => string;
  refs: QuestRefs;
  questCode: Ref<string>;
  contextProjectId: Ref<string>;
  backLink: Ref<string>;
  isAudioQuest: Ref<boolean>;
  routerPush: (path: string) => Promise<void>;
};

export function createQuestActions(args: QuestActionsArgs) {
  const { t, refs, questCode, contextProjectId, backLink, isAudioQuest, routerPush } = args;

  async function bootstrap() {
    await sessionStore.bootstrap();
  }

  async function loadQuest() {
    refs.error.value = null;
    refs.quest.value = null;
    refs.attemptId.value = null;
    refs.audioArtifactId.value = null;
    refs.transcriptId.value = null;
    refs.text.value = "";
    refs.submittedTextSnapshot.value = null;

    const code = questCode.value.trim();
    if (!code) {
      refs.error.value = t("quest.empty");
      return;
    }

    refs.isLoading.value = true;
    try {
      await bootstrap();
      if (!appState.activeProfileId || !contextProjectId.value) {
        refs.error.value = t("home.quest_empty");
        return;
      }

      if (appState.dailyQuest?.quest.code === code) {
        refs.quest.value = appState.dailyQuest.quest;
      } else {
        refs.quest.value = await trainingStore.getQuestByCode(code);
      }
    } catch (err) {
      refs.error.value = toError(err);
    } finally {
      refs.isLoading.value = false;
    }
  }

  async function submit() {
    if (!refs.quest.value) {
      refs.error.value = t("quest.empty");
      return;
    }
    if (!refs.text.value.trim()) {
      refs.error.value = t("quest.response_required");
      return;
    }
    refs.isSubmitting.value = true;
    refs.error.value = null;
    try {
      const trimmed = refs.text.value.trim();
      const attempt = await trainingStore.submitQuestTextForProject(
        contextProjectId.value,
        refs.quest.value.code,
        trimmed
      );
      refs.attemptId.value = attempt;
      refs.submittedTextSnapshot.value = trimmed;
    } catch (err) {
      refs.error.value = toError(err);
    } finally {
      refs.isSubmitting.value = false;
    }
  }

  async function handleAudioSaved(payload: { artifactId: string }) {
    if (!refs.quest.value) {
      return;
    }
    refs.error.value = null;
    refs.transcriptId.value = null;
    refs.audioArtifactId.value = payload.artifactId;
    try {
      const attempt = await trainingStore.submitQuestAudioForProject(contextProjectId.value, {
        questCode: refs.quest.value.code,
        audioArtifactId: payload.artifactId,
        transcriptId: null,
      });
      refs.attemptId.value = attempt;
    } catch (err) {
      refs.error.value = toError(err);
    }
  }

  async function handleTranscribed(payload: { transcriptId: string }) {
    if (!refs.quest.value || !refs.audioArtifactId.value) {
      return;
    }
    refs.error.value = null;
    refs.transcriptId.value = payload.transcriptId;
    try {
      const attempt = await trainingStore.submitQuestAudioForProject(contextProjectId.value, {
        questCode: refs.quest.value.code,
        audioArtifactId: refs.audioArtifactId.value,
        transcriptId: payload.transcriptId,
      });
      refs.attemptId.value = attempt;
    } catch (err) {
      refs.error.value = toError(err);
    }
  }

  async function requestFeedback() {
    if (!refs.attemptId.value) {
      refs.error.value = t("quest.empty");
      return;
    }
    if (isAudioQuest.value && !refs.transcriptId.value) {
      refs.error.value = t("quest.transcribe_first");
      return;
    }
    refs.isAnalyzing.value = true;
    refs.error.value = null;
    try {
      const feedbackId = await feedbackStore.analyzeAttempt(refs.attemptId.value);
      await routerPush(`/feedback?focus=${feedbackId}&source=quest`);
    } catch (err) {
      refs.error.value = toError(err);
    } finally {
      refs.isAnalyzing.value = false;
    }
  }

  function handleRecorderAnalyze() {
    void requestFeedback();
  }

  async function skipTranscription() {
    await routerPush(backLink.value);
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
