import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { useI18n } from "@/lib/i18n";
import type { PackInspectResponse } from "@/schemas/ipc";
import { appState } from "@/stores/app";
import { formatBytes } from "@/features/packs/composables/packsPageHelpers";
import { createPacksPageRuntime } from "@/features/packs/composables/packsPageRuntime";

export function usePacksPageState() {
  const { t } = useI18n();
  const error = ref<string | null>(null);
  const importPath = ref("");
  const importStatus = ref<"idle" | "importing" | "success" | "error">("idle");
  const importResult = ref<{ projectId: string; runId: string; peerReviewId: string } | null>(
    null
  );
  const importDetails = ref<PackInspectResponse | null>(null);
  const isInspecting = ref(false);
  const isPicking = ref(false);
  const isDragging = ref(false);
  let unlistenDragDrop: UnlistenFn | null = null;

  const activeProfileId = computed(() => appState.activeProfileId);

  const { pickPack, importReview, bootstrap, attachDragDropListener } = createPacksPageRuntime({
    state: {
      identity: {
        t,
      },
      model: {
        importPath,
        importResult,
        importDetails,
      },
      ui: {
        error,
        importStatus,
        isInspecting,
        isPicking,
        isDragging,
      },
    },
  });

  onMounted(async () => {
    await bootstrap();
    unlistenDragDrop = await attachDragDropListener();
  });

  onBeforeUnmount(() => {
    if (unlistenDragDrop) {
      unlistenDragDrop();
      unlistenDragDrop = null;
    }
  });

  return {
    error,
    importPath,
    importStatus,
    importResult,
    importDetails,
    isInspecting,
    isPicking,
    isDragging,
    activeProfileId,
    formatBytes,
    pickPack,
    importReview,
  };
}
