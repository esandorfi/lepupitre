import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import type { RunSummary } from "@/schemas/ipc";
import { appState, runStore, sessionStore, talksStore } from "@/stores/app";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

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

type BossRunRefs = {
  error: Ref<string | null>;
  isLoading: Ref<boolean>;
  isSaving: Ref<boolean>;
  isAnalyzing: Ref<boolean>;
  run: Ref<RunSummary | null>;
  pendingTranscriptId: Ref<string | null>;
};

function createBossRunRefs(): BossRunRefs {
  return {
    error: ref<string | null>(null),
    isLoading: ref(false),
    isSaving: ref(false),
    isAnalyzing: ref(false),
    run: ref<RunSummary | null>(null),
    pendingTranscriptId: ref<string | null>(null),
  };
}

type BossRunActionsArgs = {
  t: (key: string) => string;
  refs: BossRunRefs;
  activeProjectId: Ref<string | undefined>;
  requestedRunId: Ref<string>;
  routerPush: (path: string) => Promise<void>;
};

function createBossRunActions(args: BossRunActionsArgs) {
  const { t, refs, activeProjectId, requestedRunId, routerPush } = args;

  async function loadLatest() {
    refs.run.value = null;
    if (!activeProjectId.value) {
      return;
    }
    refs.isLoading.value = true;
    refs.error.value = null;
    try {
      if (requestedRunId.value) {
        refs.run.value = await runStore.getRun(requestedRunId.value);
        if (!refs.run.value) {
          refs.run.value = await runStore.getLatestRun(activeProjectId.value);
        }
      } else {
        refs.run.value = await runStore.getLatestRun(activeProjectId.value);
      }
    } catch (err) {
      refs.error.value = toError(err);
    } finally {
      refs.isLoading.value = false;
    }
  }

  async function handleAudioSaved(payload: { artifactId: string }) {
    if (!activeProjectId.value) {
      refs.error.value = t("boss_run.need_talk");
      return;
    }
    refs.pendingTranscriptId.value = null;
    refs.isSaving.value = true;
    refs.error.value = null;
    try {
      const runId = await runStore.createRun(activeProjectId.value);
      await runStore.finishRun(runId, payload.artifactId);
      if (refs.pendingTranscriptId.value) {
        await runStore.setRunTranscript(runId, refs.pendingTranscriptId.value);
        refs.pendingTranscriptId.value = null;
      }
      refs.run.value = await runStore.getLatestRun(activeProjectId.value);
    } catch (err) {
      refs.error.value = toError(err);
    } finally {
      refs.isSaving.value = false;
    }
  }

  async function handleTranscribed(payload: { transcriptId: string }) {
    if (!activeProjectId.value) {
      refs.error.value = t("boss_run.need_talk");
      return;
    }
    if (!refs.run.value) {
      refs.pendingTranscriptId.value = payload.transcriptId;
      return;
    }
    refs.error.value = null;
    try {
      await runStore.setRunTranscript(refs.run.value.id, payload.transcriptId);
      refs.run.value = await runStore.getLatestRun(activeProjectId.value);
    } catch (err) {
      refs.error.value = toError(err);
    }
  }

  async function requestFeedback() {
    if (!refs.run.value) {
      refs.error.value = t("boss_run.run_missing");
      return;
    }
    refs.isAnalyzing.value = true;
    refs.error.value = null;
    try {
      const feedbackId = await runStore.analyzeRun(refs.run.value.id);
      await routerPush(`/feedback?focus=${feedbackId}&source=boss-run`);
    } catch (err) {
      refs.error.value = toError(err);
    } finally {
      refs.isAnalyzing.value = false;
    }
  }

  function handleRecorderAnalyze() {
    void requestFeedback();
  }

  function handleViewFeedback() {
    if (refs.run.value?.feedback_id) {
      void routerPush(`/feedback/${refs.run.value.feedback_id}`);
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
    refs,
    activeProjectId,
    requestedRunId,
    routerPush: async (path) => {
      await router.push(path);
    },
  });

  onMounted(async () => {
    await sessionStore.bootstrap();
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
    t,
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
