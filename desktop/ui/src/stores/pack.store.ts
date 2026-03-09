import {
  exportPack as exportPackFromApi,
  getPeerReview as getPeerReviewFromApi,
  getPeerReviews as getPeerReviewsFromApi,
  importPeerReview as importPeerReviewFromApi,
  inspectPack as inspectPackFromApi,
} from "../domains/pack/api";
import type {
  ExportResult,
  PeerReviewDetail,
  PeerReviewSummary,
} from "../schemas/ipc";
import type { AppState } from "./appState";

function requireActiveProfileId(state: AppState): string {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return state.activeProfileId;
}

/**
 * Creates and returns the create pack store contract.
 */
export function createPackStore(state: AppState) {
  async function exportPack(runId: string): Promise<ExportResult> {
    const profileId = requireActiveProfileId(state);
    return exportPackFromApi(profileId, runId);
  }

  async function inspectPack(path: string) {
    const profileId = requireActiveProfileId(state);
    return inspectPackFromApi(profileId, path);
  }

  async function importPeerReview(path: string) {
    const profileId = requireActiveProfileId(state);
    return importPeerReviewFromApi(profileId, path);
  }

  async function getPeerReviews(
    projectId: string,
    limit = 12
  ): Promise<PeerReviewSummary[]> {
    const profileId = requireActiveProfileId(state);
    return getPeerReviewsFromApi(profileId, projectId, limit);
  }

  async function getPeerReview(peerReviewId: string): Promise<PeerReviewDetail> {
    const profileId = requireActiveProfileId(state);
    return getPeerReviewFromApi(profileId, peerReviewId);
  }

  return {
    exportPack,
    inspectPack,
    importPeerReview,
    getPeerReviews,
    getPeerReview,
  };
}

