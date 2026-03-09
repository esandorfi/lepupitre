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
import { createTalkTrainRuntime } from "@/features/talks/composables/trainPage/talkTrainPageRuntime";

/**
 * Composes train-page view state and binds runtime commands.
 * This hook owns page-level derived data while runtime owns side effects.
 */
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

  const { project, isActive, talkNumber } = useTalkProjectState(projectId);
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
      },
    },
  });

  onMounted(() => {
    void loadData();
  });

  return {
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
    questCodeLabel: (code: string) => trainingStore.formatQuestCode(projectId.value, code),
    setActive,
    markTrainStage,
  };
}
