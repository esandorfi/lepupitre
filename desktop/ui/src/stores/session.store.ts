import { isUiDevWithoutTauri } from "../lib/runtime";
import { setActivePreferenceProfile } from "../lib/preferencesStorage";
import type { AppState } from "./appState";

type SessionBootstrapDependencies = {
  loadProfiles: () => Promise<void>;
  loadActiveProject: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadDailyQuest: () => Promise<void>;
  hydratePreferenceContext: (profileId: string | null) => Promise<void>;
};

/**
 * Creates and returns the create session store contract.
 */
export function createSessionStore(
  state: AppState,
  dependencies: SessionBootstrapDependencies
) {
  let bootstrapPromise: Promise<void> | null = null;
  let uiPreviewModeLogged = false;

  async function bootstrap() {
    if (state.hasBootstrapped) {
      return;
    }

    if (isUiDevWithoutTauri()) {
      state.profiles = [];
      state.activeProfileId = null;
      state.hasBootstrapped = true;
      state.isBootstrapping = false;
      state.activeProject = null;
      state.trainingProjectId = null;
      state.projects = [];
      state.dailyQuest = null;
      state.recentAttempts = [];
      state.lastAttemptId = null;
      state.lastFeedbackId = null;
      state.lastFeedbackContext = null;
      setActivePreferenceProfile(null);
      await dependencies.hydratePreferenceContext(null);
      if (!uiPreviewModeLogged) {
        console.info("UI preview mode: running without Tauri backend runtime.");
        uiPreviewModeLogged = true;
      }
      return;
    }

    if (bootstrapPromise) {
      return bootstrapPromise;
    }

    state.isBootstrapping = true;
    bootstrapPromise = (async () => {
      await dependencies.loadProfiles();
      await dependencies.loadActiveProject();
      await dependencies.loadProjects();
      await dependencies.loadDailyQuest();
      state.hasBootstrapped = true;
    })().finally(() => {
      state.isBootstrapping = false;
      bootstrapPromise = null;
    });

    return bootstrapPromise;
  }

  async function ensureBootstrapped() {
    return bootstrap();
  }

  return {
    bootstrap,
    ensureBootstrapped,
  };
}

