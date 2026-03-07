import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "@/lib/i18n";
import { appState, talksStore } from "@/stores/app";
import { createBuilderActions } from "@/features/talks/composables/talkBuilderPageActions";
import { frameworkPrompts } from "@/features/talks/composables/talkBuilderPageHelpers";
import { createBuilderState } from "@/features/talks/composables/talkBuilderPageState";

export function useTalkBuilderPageState() {
  const { t } = useI18n();
  const route = useRoute();

  const state = createBuilderState();
  const activeProfileId = computed(() => appState.activeProfileId);
  const selectedProjectId = computed(() => {
    const paramId = String(route.params.projectId || "");
    if (paramId) {
      return paramId;
    }
    const queryId = String(route.query.projectId || "");
    if (queryId) {
      return queryId;
    }
    return appState.activeProject?.id ?? "";
  });
  const selectedProject = computed(() => {
    const projectId = selectedProjectId.value;
    if (!projectId) {
      return null;
    }
    return appState.projects.find((project) => project.id === projectId) ?? appState.activeProject ?? null;
  });
  const talkLabel = computed(() => {
    if (!selectedProject.value) {
      return "";
    }
    const number = talksStore.getTalkNumber(selectedProject.value.id);
    const prefix = number ? `T${number} - ` : "";
    return `${prefix}${selectedProject.value.title}`;
  });
  const activeFrameworkPrompts = computed(() =>
    frameworkPrompts(t, state.blueprint.value?.framework_id ?? "hook-story-proof")
  );

  const actions = createBuilderActions({
    t,
    state,
    selectedProjectId,
    activeProfileId,
  });

  onMounted(() => {
    void actions.loadOutline();
  });
  watch(
    () => selectedProjectId.value,
    () => {
      void actions.loadOutline();
    }
  );

  return {
    t,
    error: state.error,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    saveStatus: state.saveStatus,
    outline: state.outline,
    exportPath: state.exportPath,
    isExporting: state.isExporting,
    isRevealing: state.isRevealing,
    blueprint: state.blueprint,
    isApplyingTemplate: state.isApplyingTemplate,
    activeProfileId,
    selectedProjectId,
    talkLabel,
    activeFrameworkPrompts,
    applyFrameworkTemplate: actions.applyFrameworkTemplate,
    saveOutline: actions.saveOutline,
    exportOutline: actions.exportOutline,
    revealExport: actions.revealExport,
  };
}
