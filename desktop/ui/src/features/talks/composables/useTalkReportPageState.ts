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
import { createTalkReportRuntime } from "@/features/talks/composables/talkReportPageRuntime";

export function useTalkReportPageState() {
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
  const exportPath = ref<string | null>(null);
  const exportingRunId = ref<string | null>(null);
  const isRevealing = ref(false);
  const exportError = ref<string | null>(null);

  const project = computed(() => appState.projects.find((item) => item.id === projectId.value) ?? null);
  const isActive = computed(() => appState.activeProject?.id === projectId.value);
  const talkNumber = computed(() => project.value?.talk_number ?? null);
  const activeStep = computed<"train" | "export">(() => (route.name === "talk-export" ? "export" : "train"));
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

  const { exportPack, revealExport, loadReport, setActive } = createTalkReportRuntime({
    state: {
      identity: {
        projectId,
      },
      model: {
        report,
        attempts,
        runs,
        peerReviews,
      },
      ui: {
        error,
        isLoading,
        isActivating,
        exportPath,
        exportingRunId,
        isRevealing,
        exportError,
      },
    },
  });

  onMounted(() => {
    void loadReport();
  });

  return {
    t,
    projectId,
    error,
    isLoading,
    report,
    runs,
    isActivating,
    exportPath,
    exportingRunId,
    isRevealing,
    exportError,
    project,
    isActive,
    talkNumber,
    activeStep,
    summary,
    timeline,
    formatDate,
    attemptStatus: (item: { has_feedback: boolean; has_transcript: boolean; has_audio: boolean }) =>
      attemptStatus(t, item),
    runStatus: (run: RunSummary) => runStatus(t, run),
    outputLabel: (outputType: string) => outputLabel(t, outputType),
    questCodeLabel: (code: string) => trainingStore.formatQuestCode(projectId.value, code),
    exportPack,
    revealExport,
    setActive,
  };
}
