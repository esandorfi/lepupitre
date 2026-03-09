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
import { useTalkHubAccessGate } from "@/features/talks/composables/shared/talkFeatureState";
import { talkDefineRoute } from "@/features/talks/composables/shared/talkRoutes";

/**
 * Composes talks-hub page VM surfaces (`view`, `data`, `actions`) from app state + runtime.
 */
export function useTalksPageState() {
  const { locale } = useI18n();
  const { settings: uiSettings } = useUiPreferences();
  const router = useRouter();
  const gate = useTalkHubAccessGate();

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
    void router.push(talkDefineRoute(projectId));
  }

  // Keep a grouped VM API to avoid wide page-level destructuring churn.
  const view = {
    get projects() {
      return state.value.projects;
    },
    get showMascotCard() {
      return showMascotCard.value;
    },
    get mascotBody() {
      return mascotBody.value;
    },
  };

  // `data` exposes runtime-managed refs as read-only getters for page templates.
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

  const guard = {
    get hasActiveProfile() {
      return gate.hasActiveProfile.value;
    },
    get hasActiveProject() {
      return gate.hasActiveProject.value;
    },
    get canShowProjects() {
      return gate.canShowProjects.value;
    },
    get canShowBlueprint() {
      return gate.canShowBlueprint.value;
    },
    get shouldShowProfilePrompt() {
      return gate.shouldShowProfilePrompt.value;
    },
  };

  return {
    view,
    data,
    guard,
    actions: {
      setActive,
      goToDefine,
    },
  };
}
