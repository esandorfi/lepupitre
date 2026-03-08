import { computed, type ComputedRef } from "vue";
import { appState } from "@/stores/app";

export function useTalkFeatureProfileState() {
  const activeProfileId = computed(() => appState.activeProfileId);
  const hasActiveProfile = computed(() => Boolean(appState.activeProfileId));

  return {
    activeProfileId,
    hasActiveProfile,
  };
}

export function useTalkProjectState(projectId: ComputedRef<string>) {
  const project = computed(() => appState.projects.find((item) => item.id === projectId.value) ?? null);
  const isActive = computed(() => appState.activeProject?.id === projectId.value);
  const talkNumber = computed(() => project.value?.talk_number ?? null);
  const hasActiveProject = computed(() => Boolean(project.value));

  return {
    project,
    isActive,
    talkNumber,
    hasActiveProject,
  };
}
