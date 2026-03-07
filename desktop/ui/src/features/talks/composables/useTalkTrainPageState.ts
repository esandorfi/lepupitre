import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "@/lib/i18n";
import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "@/schemas/ipc";
import { appState, trainingStore } from "@/stores/app";
import {
  attemptStatus,
  buildSummary,
  buildTimeline,
  formatDate,
  outputLabel,
  runStatus,
} from "@/features/talks/composables/talkReportPageHelpers";
import { createTalkTrainRuntime } from "@/features/talks/composables/talkTrainPageRuntime";

export function useTalkTrainPageState() {
  const { t } = useI18n();
  const route = useRoute();
  const projectId = computed(() => String(route.params.projectId || ""));

  const error = ref<string | null>(null);
  const isLoading = ref(false);
  const report = ref<QuestReportItem[]>([]);
  const attempts = ref<QuestAttemptSummary[]>([]);
  const runs = ref<RunSummary[]>([]);
  const peerReviews = ref<PeerReviewSummary[]>([]);
  const isActivating = ref(false);

  const project = computed(() => appState.projects.find((item) => item.id === projectId.value) ?? null);
  const isActive = computed(() => appState.activeProject?.id === projectId.value);
  const talkNumber = computed(() => project.value?.talk_number ?? null);
  const summary = computed(() => buildSummary(report.value));
  const timeline = computed(() =>
    buildTimeline(
      t,
      projectId.value,
      attempts.value,
      runs.value,
      peerReviews.value,
      (code: string) => trainingStore.formatQuestCode(projectId.value, code)
    )
  );

  const { loadData, setActive, markTrainStage } = createTalkTrainRuntime({
    projectId,
    error,
    isLoading,
    isActivating,
    report,
    attempts,
    runs,
    peerReviews,
  });

  onMounted(() => {
    void loadData();
  });

  return {
    t,
    projectId,
    error,
    isLoading,
    report,
    isActivating,
    project,
    isActive,
    talkNumber,
    summary,
    timeline,
    formatDate,
    attemptStatus: (item: { has_feedback: boolean; has_transcript: boolean; has_audio: boolean }) =>
      attemptStatus(t, item),
    runStatus: (run: RunSummary) => runStatus(t, run),
    outputLabel: (type: string) => outputLabel(t, type),
    questCodeLabel: (code: string) => trainingStore.formatQuestCode(projectId.value, code),
    setActive,
    markTrainStage,
  };
}
