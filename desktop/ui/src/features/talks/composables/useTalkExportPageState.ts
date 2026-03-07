import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "@/lib/i18n";
import type { PeerReviewSummary, QuestReportItem, RunSummary } from "@/schemas/ipc";
import { appState } from "@/stores/app";
import {
  buildSummary,
  formatDate,
  runStatus,
} from "@/features/talks/composables/talkReportPageHelpers";
import { createTalkExportRuntime } from "@/features/talks/composables/talkExportPageRuntime";

export function useTalkExportPageState() {
  const { t } = useI18n();
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

  const project = computed(() => appState.projects.find((item) => item.id === projectId.value) ?? null);
  const isActive = computed(() => appState.activeProject?.id === projectId.value);
  const talkNumber = computed(() => project.value?.talk_number ?? null);
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
    t,
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
    runStatus: (run: RunSummary) => runStatus(t, run),
    exportPack,
    exportOutline,
    revealExport,
    setActive,
    markExportStage,
  };
}
