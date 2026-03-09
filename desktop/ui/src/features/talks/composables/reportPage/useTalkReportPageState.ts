import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "@/lib/i18n";
import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "@/schemas/ipc";
import { trainingStore } from "@/stores/app";
import {
  buildSummary,
  buildTimeline,
  formatDate,
} from "@/features/talks/composables/reportPage/talkReportPageHelpers";
import { useTalkProjectState } from "@/features/talks/composables/shared/talkFeatureState";
import { createTalkReportRuntime } from "@/features/talks/composables/reportPage/talkReportPageRuntime";

/**
 * Composes report-page view state and timeline projections.
 * Runtime remains the only layer performing fetch/export side effects.
 */
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

  const { project, isActive, talkNumber } = useTalkProjectState(projectId);
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
    questCodeLabel: (code: string) => trainingStore.formatQuestCode(projectId.value, code),
    exportPack,
    revealExport,
    setActive,
  };
}
