import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { useUiPreferences } from "@/lib/uiPreferences";
import type { MascotMessage, TalksBlueprint } from "@/schemas/ipc";
import { appState } from "@/stores/app";
import {
  bindTalksLifecycle,
  createTalksRuntime,
} from "@/features/talks/composables/talksPage/talksPageRuntime";
import { useTalkFeatureProfileState } from "@/features/talks/composables/shared/talkFeatureState";
import { talkDefineRoute } from "@/features/talks/composables/shared/talkRoutes";

export function useTalksPageState() {
  const { t, locale } = useI18n();
  const { settings: uiSettings } = useUiPreferences();
  const router = useRouter();
  const { hasActiveProfile } = useTalkFeatureProfileState();

  const state = computed(() => appState);
  const error = ref<string | null>(null);
  const errorCategory = ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null);
  const isLoading = ref(false);
  const isBlueprintLoading = ref(false);
  const isSwitching = ref<string | null>(null);
  const mascotMessage = ref<MascotMessage | null>(null);
  const talksBlueprint = ref<TalksBlueprint | null>(null);

  const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
  const hasActiveProject = computed(() => Boolean(state.value.activeProject));
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
    void router.push(talkDefineRoute(projectId));
  }

  const view = {
    get projects() {
      return state.value.projects;
    },
    get hasActiveProfile() {
      return hasActiveProfile.value;
    },
    get hasActiveProject() {
      return hasActiveProject.value;
    },
    get showMascotCard() {
      return showMascotCard.value;
    },
    get mascotBody() {
      return mascotBody.value;
    },
  };

  const data = {
    get error() {
      return error.value;
    },
    get isLoading() {
      return isLoading.value;
    },
    get isBlueprintLoading() {
      return isBlueprintLoading.value;
    },
    get isSwitching() {
      return isSwitching.value;
    },
    get mascotMessage() {
      return mascotMessage.value;
    },
    get talksBlueprint() {
      return talksBlueprint.value;
    },
  };

  return {
    t,
    view,
    data,
    actions: {
      setActive,
      goToDefine,
    },
  };
}
