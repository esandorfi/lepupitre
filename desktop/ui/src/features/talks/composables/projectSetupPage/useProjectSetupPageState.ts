import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { appState } from "@/stores/app";
import { useTalkFeatureProfileState } from "@/features/talks/composables/shared/talkFeatureState";
import { createProjectSetupPageRuntime } from "@/features/talks/composables/projectSetupPage/projectSetupPageRuntime";

export function useProjectSetupPageState() {
  const { t } = useI18n();
  const router = useRouter();
  const title = ref("");
  const audience = ref("");
  const goal = ref("");
  const duration = ref("");
  const error = ref<string | null>(null);
  const errorCategory = ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(
    null
  );
  const isSaving = ref(false);

  const { activeProfileId } = useTalkFeatureProfileState();
  const activeProject = computed(() =>
    appState.activeProject ? { id: appState.activeProject.id, title: appState.activeProject.title } : null
  );

  const runtime = createProjectSetupPageRuntime({
    t,
    pushHome: async () => {
      await router.push("/");
    },
    state: {
      model: {
        activeProfileId,
        activeProject,
      },
      draft: {
        title,
        audience,
        goal,
        duration,
      },
      ui: {
        error,
        errorCategory,
        isSaving,
      },
    },
  });

  onMounted(() => {
    void runtime.bootstrap();
  });

  return {
    t,
    title,
    audience,
    goal,
    duration,
    error,
    isSaving,
    activeProfileId,
    activeProject,
    saveProject: runtime.saveProject,
  };
}
