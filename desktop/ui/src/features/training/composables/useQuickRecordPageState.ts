import { computed } from "vue";
import { appState } from "@/stores/app";

/**
 * Provides the use quick record page state composable contract.
 */
export function useQuickRecordPageState() {
  const activeProfileId = computed(() => appState.activeProfileId);

  return {
    activeProfileId,
  };
}
