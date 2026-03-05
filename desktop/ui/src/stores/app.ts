import { appState as state } from "./appState";
import { createCoachStore } from "./coach.store";
import { createFeedbackStore } from "./feedback.store";
import { createPackStore } from "./pack.store";
import { createRunStore } from "./run.store";
import { createSessionStore } from "./session.store";
import { createTalksStore } from "./talks.store";
import { createTrainingStore } from "./training.store";
import { createWorkspaceStore } from "./workspace.store";

export const workspaceStore = createWorkspaceStore(state);
export const talksStore = createTalksStore(state);
export const trainingStore = createTrainingStore(state, {
  ensureTrainingProject: talksStore.ensureTrainingProject,
  getTalkNumber: talksStore.getTalkNumber,
});
export const feedbackStore = createFeedbackStore(state);
export const runStore = createRunStore(state);
export const packStore = createPackStore(state);
export const coachStore = createCoachStore(state);

export const sessionStore = createSessionStore(state, {
  loadProfiles: workspaceStore.loadProfiles,
  loadActiveProject: talksStore.loadActiveProject,
  loadProjects: talksStore.loadProjects,
  loadDailyQuest: trainingStore.loadDailyQuest,
  hydratePreferenceContext: workspaceStore.hydratePreferenceContext,
});

export const appState = state;
