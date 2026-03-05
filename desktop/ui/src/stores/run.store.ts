import {
  analyzeRun as analyzeRunFromApi,
  createRun as createRunFromApi,
  finishRun as finishRunFromApi,
  getLatestRun as getLatestRunFromApi,
  getRun as getRunFromApi,
  getRuns as getRunsFromApi,
  setRunTranscript as setRunTranscriptFromApi,
} from "../domains/run/api";
import type { RunSummary } from "../schemas/ipc";
import type { AppState } from "./appState";

function requireActiveProfileId(state: AppState): string {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return state.activeProfileId;
}

export function createRunStore(state: AppState) {
  async function createRun(projectId: string) {
    const profileId = requireActiveProfileId(state);
    return createRunFromApi(profileId, projectId);
  }

  async function finishRun(runId: string, audioArtifactId: string) {
    const profileId = requireActiveProfileId(state);
    await finishRunFromApi(profileId, runId, audioArtifactId);
  }

  async function setRunTranscript(runId: string, transcriptId: string) {
    const profileId = requireActiveProfileId(state);
    await setRunTranscriptFromApi(profileId, runId, transcriptId);
  }

  async function analyzeRun(runId: string) {
    const profileId = requireActiveProfileId(state);
    const response = await analyzeRunFromApi(profileId, runId);
    state.lastFeedbackId = response.feedbackId;
    return response.feedbackId;
  }

  async function getLatestRun(projectId: string): Promise<RunSummary | null> {
    const profileId = requireActiveProfileId(state);
    return getLatestRunFromApi(profileId, projectId);
  }

  async function getRun(runId: string): Promise<RunSummary | null> {
    const profileId = requireActiveProfileId(state);
    return getRunFromApi(profileId, runId);
  }

  async function getRuns(projectId: string, limit = 12): Promise<RunSummary[]> {
    const profileId = requireActiveProfileId(state);
    return getRunsFromApi(profileId, projectId, limit);
  }

  return {
    createRun,
    finishRun,
    setRunTranscript,
    analyzeRun,
    getLatestRun,
    getRun,
    getRuns,
  };
}

