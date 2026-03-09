import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import type { PeerReviewSummary, QuestReportItem, RunSummary } from "@/schemas/ipc";
import {
  buildSummary,
  formatDate,
} from "@/features/talks/composables/reportPage/talkReportPageHelpers";
import { useTalkProjectState } from "@/features/talks/composables/shared/talkFeatureState";
import { createTalkExportRuntime } from "@/features/talks/composables/exportPage/talkExportPageRuntime";

/**
 * Composes export-page reactive state and binds export runtime commands.
 * Keep orchestration in runtime so template logic remains declarative.
 */
export function useTalkExportPageState() {
  const route = useRoute();
  const projectId = computed(() => String(route.params.projectId || ""));

  const error = ref<string | null>(null);
  const isLoading = ref(false);
  const isActivating = ref(false);
  const report = ref<QuestReportItem[]>([]);
  const runs = ref<RunSummary[]>([]);
  const peerReviews = ref<PeerReviewSummary[]>([]);
  const exportPath = ref<string | null>(null);
  const exportingRunId = ref<string | null>(null);
  const isExportingOutline = ref(false);
  const isRevealing = ref(false);
  const exportError = ref<string | null>(null);

  const { project, isActive, talkNumber } = useTalkProjectState(projectId);
  const summary = computed(() => buildSummary(report.value));

  const {
    markExportStage,
    exportPack,
    exportOutline,
    revealExport,
    loadData,
    setActive,
  } = createTalkExportRuntime({
    state: {
      identity: {
        projectId,
      },
      model: {
        report,
        runs,
        peerReviews,
      },
      ui: {
        error,
        isLoading,
        isActivating,
        exportPath,
        exportingRunId,
        isExportingOutline,
        isRevealing,
        exportError,
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
    isActivating,
    runs,
    peerReviews,
    exportPath,
    exportingRunId,
    isExportingOutline,
    isRevealing,
    exportError,
    project,
    isActive,
    talkNumber,
    summary,
    formatDate,
    exportPack,
    exportOutline,
    revealExport,
    setActive,
    markExportStage,
  };
}
