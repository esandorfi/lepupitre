import {
  getMascotContextMessage as getMascotContextMessageFromApi,
  getProgressSnapshot as getProgressSnapshotFromApi,
  getTalksBlueprint as getTalksBlueprintFromApi,
} from "../domains/coach/api";
import type {
  MascotMessage,
  ProgressSnapshot,
  TalksBlueprint,
} from "../schemas/ipc";
import type { AppState } from "./appState";

function requireActiveProfileId(state: AppState): string {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return state.activeProfileId;
}

export function createCoachStore(state: AppState) {
  async function getProgressSnapshot(projectId?: string | null): Promise<ProgressSnapshot> {
    const profileId = requireActiveProfileId(state);
    return getProgressSnapshotFromApi(profileId, projectId ?? null);
  }

  async function getMascotContextMessage(payload: {
    routeName: string;
    projectId?: string | null;
    locale?: string | null;
  }): Promise<MascotMessage> {
    const profileId = requireActiveProfileId(state);
    return getMascotContextMessageFromApi(profileId, payload);
  }

  async function getTalksBlueprint(
    projectId: string,
    locale?: string | null
  ): Promise<TalksBlueprint> {
    const profileId = requireActiveProfileId(state);
    return getTalksBlueprintFromApi(profileId, projectId, locale ?? null);
  }

  return {
    getProgressSnapshot,
    getMascotContextMessage,
    getTalksBlueprint,
  };
}

