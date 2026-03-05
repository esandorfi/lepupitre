import {
  analyzeAttempt as analyzeAttemptFromApi,
  getFeedback as getFeedbackFromApi,
  getFeedbackContext as getFeedbackContextFromApi,
  getFeedbackNote as getFeedbackNoteFromApi,
  getFeedbackTimeline as getFeedbackTimelineFromApi,
  setFeedbackNote as setFeedbackNoteFromApi,
} from "../domains/feedback/api";
import type {
  FeedbackContext,
  FeedbackTimelineItem,
  FeedbackV1,
} from "../schemas/ipc";
import type { AppState } from "./appState";

function requireActiveProfileId(state: AppState): string {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return state.activeProfileId;
}

export function createFeedbackStore(state: AppState) {
  async function analyzeAttempt(attemptId: string) {
    const profileId = requireActiveProfileId(state);
    const response = await analyzeAttemptFromApi(profileId, attemptId);
    state.lastFeedbackId = response.feedbackId;
    return response.feedbackId;
  }

  async function getFeedback(feedbackId: string): Promise<FeedbackV1> {
    const profileId = requireActiveProfileId(state);
    return getFeedbackFromApi(profileId, feedbackId);
  }

  async function getFeedbackContext(feedbackId: string): Promise<FeedbackContext> {
    const profileId = requireActiveProfileId(state);
    const context = await getFeedbackContextFromApi(profileId, feedbackId);
    state.lastFeedbackContext = context;
    return context;
  }

  async function getFeedbackTimeline(
    projectId?: string | null,
    limit?: number | null
  ): Promise<FeedbackTimelineItem[]> {
    const profileId = requireActiveProfileId(state);
    return getFeedbackTimelineFromApi(profileId, projectId, limit);
  }

  async function getFeedbackNote(feedbackId: string): Promise<string | null> {
    const profileId = requireActiveProfileId(state);
    return getFeedbackNoteFromApi(profileId, feedbackId);
  }

  async function setFeedbackNote(feedbackId: string, note: string) {
    const profileId = requireActiveProfileId(state);
    await setFeedbackNoteFromApi(profileId, feedbackId, note);
  }

  return {
    analyzeAttempt,
    getFeedback,
    getFeedbackContext,
    getFeedbackTimeline,
    getFeedbackNote,
    setFeedbackNote,
  };
}

