import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import {
  canAnalyzeQuest,
  canLeaveQuestWithoutFeedback,
  canSubmitQuestText,
  questAnalysisHintKey,
} from "@/lib/questFlow";
import type { Quest } from "@/schemas/ipc";
import { appState, feedbackStore, sessionStore, trainingStore } from "@/stores/app";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

type QuestRefs = {
  text: Ref<string>;
  error: Ref<string | null>;
  isSubmitting: Ref<boolean>;
  isAnalyzing: Ref<boolean>;
  isLoading: Ref<boolean>;
  submittedTextSnapshot: Ref<string | null>;
  quest: Ref<Quest | null>;
  attemptId: Ref<string | null>;
  audioArtifactId: Ref<string | null>;
  transcriptId: Ref<string | null>;
};

function createQuestRefs(): QuestRefs {
  return {
    text: ref(""),
    error: ref<string | null>(null),
    isSubmitting: ref(false),
    isAnalyzing: ref(false),
    isLoading: ref(false),
    submittedTextSnapshot: ref<string | null>(null),
    quest: ref<Quest | null>(null),
    attemptId: ref<string | null>(null),
    audioArtifactId: ref<string | null>(null),
    transcriptId: ref<string | null>(null),
  };
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

function createQuestActions(args: QuestActionsArgs) {
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

export function useQuestPageState() {
  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const refs = createQuestRefs();

  const questCode = computed(() => String(route.params.questCode || ""));
  const routeProjectId = computed(() => String(route.query.projectId || ""));
  const contextProjectId = computed(() => routeProjectId.value || appState.activeProject?.id || "");
  const backLink = computed(() => {
    if (route.query.from === "training") {
      return "/training";
    }
    if (route.query.projectId) {
      return `/talks/${route.query.projectId}/train`;
    }
    if (appState.activeProject?.id) {
      return `/talks/${appState.activeProject.id}/train`;
    }
    return "/training";
  });
  const displayQuestCode = computed(() => {
    const code = questCode.value;
    if (!code) {
      return t("quest.daily");
    }
    return trainingStore.formatQuestCode(contextProjectId.value, code);
  });
  const isAudioQuest = computed(() => refs.quest.value?.output_type.toLowerCase() === "audio");
  const flowState = computed(() => ({
    isAudioQuest: isAudioQuest.value,
    isSubmitting: refs.isSubmitting.value,
    text: refs.text.value,
    submittedTextSnapshot: refs.submittedTextSnapshot.value,
    attemptId: refs.attemptId.value,
    transcriptId: refs.transcriptId.value,
    audioArtifactId: refs.audioArtifactId.value,
  }));
  const canSubmitText = computed(() => canSubmitQuestText(flowState.value));
  const canAnalyze = computed(() => canAnalyzeQuest(flowState.value));
  const submitTextLabel = computed(() => {
    if (refs.submittedTextSnapshot.value && refs.text.value.trim() !== refs.submittedTextSnapshot.value) {
      return t("quest.submit_update");
    }
    return t("quest.submit");
  });
  const analyzeLabel = computed(() =>
    isAudioQuest.value && refs.attemptId.value && !refs.transcriptId.value
      ? t("quest.transcribe_first")
      : t("quest.analyze")
  );
  const captureStatusLabel = computed(() => {
    if (!refs.attemptId.value) {
      return null;
    }
    if (!isAudioQuest.value) {
      return t("quest.capture_saved_text");
    }
    if (refs.transcriptId.value) {
      return t("quest.capture_ready_audio");
    }
    return t("quest.capture_saved_audio");
  });
  const analysisHint = computed(() => t(questAnalysisHintKey(flowState.value)));
  const canLeaveWithoutFeedback = computed(() => canLeaveQuestWithoutFeedback(flowState.value));

  const actions = createQuestActions({
    t,
    refs,
    questCode,
    contextProjectId,
    backLink,
    isAudioQuest,
    routerPush: async (path) => {
      await router.push(path);
    },
  });

  onMounted(() => {
    void actions.loadQuest();
  });
  watch([questCode, routeProjectId], () => {
    void actions.loadQuest();
  });
  watch(refs.text, (nextValue) => {
    if (isAudioQuest.value || !refs.attemptId.value || refs.submittedTextSnapshot.value === null) {
      return;
    }
    if (nextValue.trim() !== refs.submittedTextSnapshot.value) {
      refs.attemptId.value = null;
      refs.submittedTextSnapshot.value = null;
    }
  });

  return {
    t,
    questCode,
    backLink,
    displayQuestCode,
    text: refs.text,
    error: refs.error,
    isSubmitting: refs.isSubmitting,
    isAnalyzing: refs.isAnalyzing,
    isLoading: refs.isLoading,
    quest: refs.quest,
    attemptId: refs.attemptId,
    submittedTextSnapshot: refs.submittedTextSnapshot,
    audioArtifactId: refs.audioArtifactId,
    transcriptId: refs.transcriptId,
    isAudioQuest,
    canSubmitText,
    canAnalyze,
    submitTextLabel,
    analyzeLabel,
    captureStatusLabel,
    analysisHint,
    canLeaveWithoutFeedback,
    submit: actions.submit,
    handleAudioSaved: actions.handleAudioSaved,
    handleTranscribed: actions.handleTranscribed,
    requestFeedback: actions.requestFeedback,
    handleRecorderAnalyze: actions.handleRecorderAnalyze,
    skipTranscription: actions.skipTranscription,
  };
}
