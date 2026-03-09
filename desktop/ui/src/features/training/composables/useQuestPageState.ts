import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import {
  canAnalyzeQuest,
  canLeaveQuestWithoutFeedback,
  canSubmitQuestText,
  questAnalysisHintKey,
} from "@/lib/questFlow";
import { appState, trainingStore } from "@/stores/app";
import { createQuestActions } from "@/features/training/composables/questPageState.actions";
import { createQuestRefs } from "@/features/training/composables/questPageState.refs";

/**
 * Provides the use quest page state composable contract.
 */
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
    routerPush: async (path) => {
      await router.push(path);
    },
    state: {
      identity: {
        questCode,
        contextProjectId,
        backLink,
        isAudioQuest,
      },
      model: {
        quest: refs.quest,
        attemptId: refs.attemptId,
        audioArtifactId: refs.audioArtifactId,
        transcriptId: refs.transcriptId,
        text: refs.text,
        submittedTextSnapshot: refs.submittedTextSnapshot,
      },
      ui: {
        error: refs.error,
        isSubmitting: refs.isSubmitting,
        isAnalyzing: refs.isAnalyzing,
        isLoading: refs.isLoading,
      },
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
