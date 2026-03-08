import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { useUiPreferences } from "@/lib/uiPreferences";
import type { MascotMessage, TalksBlueprint } from "@/schemas/ipc";
import { appState } from "@/stores/app";
import {
  blueprintPercentClass,
  blueprintStepClass,
  formatDuration,
  formatLastActivity,
  mascotToneClass,
  talkNumberLabel,
  talkStageLabel,
} from "@/features/talks/composables/talksPageHelpers";
import {
  bindTalksLifecycle,
  createTalksRuntime,
} from "@/features/talks/composables/talksPageRuntime";

export function useTalksPageState() {
  const { t, locale } = useI18n();
  const { settings: uiSettings } = useUiPreferences();
  const router = useRouter();

  const state = computed(() => appState);
  const error = ref<string | null>(null);
  const errorCategory = ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null);
  const isLoading = ref(false);
  const isBlueprintLoading = ref(false);
  const isSwitching = ref<string | null>(null);
  const mascotMessage = ref<MascotMessage | null>(null);
  const talksBlueprint = ref<TalksBlueprint | null>(null);

  const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
  const mascotBody = computed(() =>
    uiSettings.value.mascotIntensity === "minimal" ? "" : mascotMessage.value?.body ?? ""
  );

  const { refreshTalksBlueprint, refreshMascotMessage, bootstrap, setActive } = createTalksRuntime({
    state: {
      identity: {
        locale,
        showMascotCard,
      },
      model: {
        appState: state,
        mascotMessage,
        talksBlueprint,
      },
      draft: {},
      ui: {
        error,
        errorCategory,
        isLoading,
        isBlueprintLoading,
        isSwitching,
      },
    },
  });

  bindTalksLifecycle({
    locale,
    mascotEnabled: computed(() => uiSettings.value.mascotEnabled),
    mascotIntensity: computed(() => uiSettings.value.mascotIntensity),
    activeProjectId: computed(() => state.value.activeProject?.id ?? ""),
    bootstrap,
    refreshTalksBlueprint,
    refreshMascotMessage,
  });

  function goToDefine(projectId: string) {
    void router.push(`/talks/${projectId}/define`);
  }

  return {
    t,
    state,
    error,
    isLoading,
    isBlueprintLoading,
    isSwitching,
    mascotMessage,
    talksBlueprint,
    showMascotCard,
    mascotBody,
    mascotToneClass,
    blueprintPercentClass,
    blueprintStepClass,
    formatDuration,
    formatLastActivity: (value: string | null | undefined) => formatLastActivity(t, value),
    talkNumberLabel,
    talkStageLabel: (stage: string | null | undefined) => talkStageLabel(t, stage),
    setActive,
    goToDefine,
  };
}
