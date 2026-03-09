import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { appState, talksStore } from "@/stores/app";
import { createBossRunActions } from "@/features/training/composables/bossRunPageState.actions";
import { createBossRunRefs } from "@/features/training/composables/bossRunPageState.refs";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}


/**
 * Provides the use boss run page state composable contract.
 */
export function useBossRunPageState() {
  const { t } = useI18n();
  const router = useRouter();
  const route = useRoute();
  const refs = createBossRunRefs();

  const requestedRunId = computed(() => String(route.query.runId || ""));
  const activeProfileId = computed(() => appState.activeProfileId);
  const activeProject = computed(() => appState.activeProject);
  const activeProjectId = computed(() => activeProject.value?.id);
  const talkLabel = computed(() => {
    if (!activeProject.value) {
      return "";
    }
    const number = talksStore.getTalkNumber(activeProject.value.id);
    const prefix = number ? `T${number} - ` : "";
    return `${prefix}${activeProject.value.title}`;
  });
  const runStatus = computed(() => {
    if (!refs.run.value) {
      return t("boss_run.status_empty");
    }
    if (refs.run.value.feedback_id) {
      return t("boss_run.status_feedback");
    }
    if (refs.run.value.transcript_id) {
      return t("boss_run.status_transcribed");
    }
    if (refs.run.value.audio_artifact_id) {
      return t("boss_run.status_recorded");
    }
    return t("boss_run.status_empty");
  });
  const hasAnalysisResult = computed(() => !!refs.run.value?.feedback_id);

  const actions = createBossRunActions({
    t,
    routerPush: async (path) => {
      await router.push(path);
    },
    state: {
      identity: {
        activeProjectId,
        requestedRunId,
      },
      model: {
        run: refs.run,
        pendingTranscriptId: refs.pendingTranscriptId,
      },
      ui: {
        error: refs.error,
        isLoading: refs.isLoading,
        isSaving: refs.isSaving,
        isAnalyzing: refs.isAnalyzing,
      },
    },
  });

  onMounted(async () => {
    await actions.bootstrap();
    await actions.loadLatest();
  });

  watch(
    () => activeProjectId.value,
    async () => {
      await actions.loadLatest();
    }
  );

  watch(
    () => requestedRunId.value,
    () => {
      void actions.loadLatest();
    }
  );

  return {
    error: refs.error,
    isLoading: refs.isLoading,
    isSaving: refs.isSaving,
    isAnalyzing: refs.isAnalyzing,
    run: refs.run,
    requestedRunId,
    activeProfileId,
    activeProject,
    talkLabel,
    runStatus,
    hasAnalysisResult,
    formatDate,
    handleAudioSaved: actions.handleAudioSaved,
    handleTranscribed: actions.handleTranscribed,
    handleRecorderAnalyze: actions.handleRecorderAnalyze,
    handleViewFeedback: actions.handleViewFeedback,
  };
}
