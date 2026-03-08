import { computed } from "vue";
import { useI18n } from "@/lib/i18n";
import { appState } from "@/stores/app";

export function useQuickRecordPageState() {
  const { t } = useI18n();
  const activeProfileId = computed(() => appState.activeProfileId);

  return {
    t,
    activeProfileId,
  };
}
