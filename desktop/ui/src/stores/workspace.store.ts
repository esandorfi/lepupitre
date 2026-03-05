import {
  createProfile as createWorkspaceProfile,
  deleteProfile as deleteWorkspaceProfile,
  listProfiles as listWorkspaceProfiles,
  renameProfile as renameWorkspaceProfile,
  switchProfile as switchWorkspaceProfile,
} from "../domains/workspace/api";
import { hydratePreferences, setActivePreferenceProfile } from "../lib/preferencesStorage";
import type { AppState } from "./appState";

const GLOBAL_PREFERENCE_KEYS = [
  "lepupitre_ui_settings_v1",
  "lepupitre_theme",
  "lepupitre_transcription_settings",
  "lepupitre_locale",
  "lepupitre_nav_metrics_v1",
  "lepupitre_recorder_health_metrics_v1",
  "lepupitre_workspace_toolbar_colors_v1",
] as const;

function profilePreferenceKeys(profileId: string) {
  return [
    `lepupitre.training.heroQuest.${profileId}`,
    `lepupitre.training.achievements.${profileId}`,
    `lepupitre.feedback.reviewed.${profileId}`,
  ] as const;
}

async function hydratePreferenceContext(profileId: string | null) {
  const entries: Array<{
    key: string;
    options?: { scope: "profile"; profileId: string };
  }> = GLOBAL_PREFERENCE_KEYS.map((key) => ({ key }));

  if (profileId) {
    entries.push(
      ...profilePreferenceKeys(profileId).map((key) => ({
        key,
        options: { scope: "profile" as const, profileId },
      }))
    );
  }

  await hydratePreferences(entries);
}

export function createWorkspaceStore(state: AppState) {
  async function loadProfiles() {
    const profiles = await listWorkspaceProfiles();
    state.profiles = profiles;
    const active = profiles.find((profile) => profile.is_active);
    state.activeProfileId = active?.id ?? null;
    state.trainingProjectId = null;
    setActivePreferenceProfile(state.activeProfileId);
    await hydratePreferenceContext(state.activeProfileId);
  }

  async function createProfile(name: string) {
    const id = await createWorkspaceProfile(name);
    await loadProfiles();
    state.activeProfileId = id;
    return id;
  }

  async function switchProfile(profileId: string) {
    await switchWorkspaceProfile(profileId);
    await loadProfiles();
  }

  async function renameProfile(profileId: string, name: string) {
    await renameWorkspaceProfile(profileId, name);
    await loadProfiles();
  }

  async function deleteProfile(profileId: string) {
    await deleteWorkspaceProfile(profileId);
    await loadProfiles();
  }

  return {
    loadProfiles,
    createProfile,
    switchProfile,
    renameProfile,
    deleteProfile,
    hydratePreferenceContext,
  };
}

