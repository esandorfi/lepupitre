import { computed } from "vue";
import { appState } from "@/stores/app";

export function useQuickRecordPageState() {
  const activeProfileId = computed(() => appState.activeProfileId);

  return {
    activeProfileId,
  };
}
