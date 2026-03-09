import { computed, type ComputedRef } from "vue";
import { appState } from "@/stores/app";

// Shared selectors for talks pages. Keep store reads centralized to avoid ad hoc page duplicates.
/**
 * Exposes profile-scoped selectors shared across talks pages.
 */
export function useTalkFeatureProfileState() {
  const activeProfileId = computed(() => appState.activeProfileId);
  const hasActiveProfile = computed(() => Boolean(appState.activeProfileId));

  return {
    activeProfileId,
    hasActiveProfile,
  };
}

// Project-scoped selectors derived from the global app state for a route-level `projectId`.
/**
 * Exposes project-scoped selectors resolved from app state for a route project id.
 */
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

export type TalkHubAccessGate = {
  hasActiveProfile: ComputedRef<boolean>;
  hasActiveProject: ComputedRef<boolean>;
  canShowProjects: ComputedRef<boolean>;
  canShowBlueprint: ComputedRef<boolean>;
  shouldShowProfilePrompt: ComputedRef<boolean>;
};

/**
 * Centralizes talks-hub access checks so pages evaluate feature guards once.
 * Child panels should receive only render-ready inputs, not access booleans to re-check.
 */
export function useTalkHubAccessGate(): TalkHubAccessGate {
  const hasActiveProfile = computed(() => Boolean(appState.activeProfileId));
  const hasActiveProject = computed(() => Boolean(appState.activeProject));
  const canShowProjects = computed(() => hasActiveProfile.value);
  const canShowBlueprint = computed(() => hasActiveProfile.value && hasActiveProject.value);
  const shouldShowProfilePrompt = computed(() => !hasActiveProfile.value);

  return {
    hasActiveProfile,
    hasActiveProject,
    canShowProjects,
    canShowBlueprint,
    shouldShowProfilePrompt,
  };
}
