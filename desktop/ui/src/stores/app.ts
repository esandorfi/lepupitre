import type { ProjectUpdatePayload } from "../schemas/ipc";
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

async function refreshProfileContext() {
  await talksStore.loadActiveProject();
  await talksStore.loadProjects();
  await trainingStore.loadDailyQuest();
}

async function createProfile(name: string) {
  const id = await workspaceStore.createProfile(name);
  await refreshProfileContext();
  return id;
}

async function switchProfile(profileId: string) {
  await workspaceStore.switchProfile(profileId);
  await refreshProfileContext();
}

async function deleteProfile(profileId: string) {
  await workspaceStore.deleteProfile(profileId);
  await refreshProfileContext();
}

async function createProject(payload: {
  title: string;
  audience?: string | null;
  goal?: string | null;
  duration_target_sec?: number | null;
}) {
  const id = await talksStore.createProject(payload);
  await trainingStore.loadDailyQuest();
  return id;
}

async function updateProject(projectId: string, payload: ProjectUpdatePayload) {
  await talksStore.updateProject(projectId, payload);
}

async function setActiveProject(projectId: string) {
  await talksStore.setActiveProject(projectId);
  await trainingStore.loadDailyQuest();
}

export const sessionStore = createSessionStore(state, {
  loadProfiles: workspaceStore.loadProfiles,
  loadActiveProject: talksStore.loadActiveProject,
  loadProjects: talksStore.loadProjects,
  loadDailyQuest: trainingStore.loadDailyQuest,
  hydratePreferenceContext: workspaceStore.hydratePreferenceContext,
});

export const appState = state;

export const appStore = {
  state,
  bootstrap: sessionStore.bootstrap,
  ensureBootstrapped: sessionStore.ensureBootstrapped,
  loadProfiles: workspaceStore.loadProfiles,
  loadProjects: talksStore.loadProjects,
  createProfile,
  renameProfile: workspaceStore.renameProfile,
  deleteProfile,
  switchProfile,
  loadActiveProject: talksStore.loadActiveProject,
  createProject,
  updateProject,
  ensureProjectStageAtLeast: talksStore.ensureProjectStageAtLeast,
  setActiveProject,
  ensureTrainingProject: trainingStore.ensureTrainingProject,
  loadDailyQuest: trainingStore.loadDailyQuest,
  loadRecentAttempts: trainingStore.loadRecentAttempts,
  getDailyQuestForProject: trainingStore.getDailyQuestForProject,
  getProgressSnapshot: coachStore.getProgressSnapshot,
  getMascotContextMessage: coachStore.getMascotContextMessage,
  getTalksBlueprint: coachStore.getTalksBlueprint,
  getQuestAttempts: trainingStore.getQuestAttempts,
  submitQuestText: trainingStore.submitQuestText,
  submitQuestTextForProject: trainingStore.submitQuestTextForProject,
  submitQuestAudio: trainingStore.submitQuestAudio,
  submitQuestAudioForProject: trainingStore.submitQuestAudioForProject,
  getQuestByCode: trainingStore.getQuestByCode,
  getQuestList: trainingStore.getQuestList,
  getQuestReport: trainingStore.getQuestReport,
  getTalkNumber: talksStore.getTalkNumber,
  formatQuestCode: trainingStore.formatQuestCode,
  analyzeAttempt: feedbackStore.analyzeAttempt,
  createRun: runStore.createRun,
  finishRun: runStore.finishRun,
  setRunTranscript: runStore.setRunTranscript,
  analyzeRun: runStore.analyzeRun,
  getLatestRun: runStore.getLatestRun,
  getRun: runStore.getRun,
  getRuns: runStore.getRuns,
  getOutline: talksStore.getOutline,
  saveOutline: talksStore.saveOutline,
  exportOutline: talksStore.exportOutline,
  exportPack: packStore.exportPack,
  inspectPack: packStore.inspectPack,
  importPeerReview: packStore.importPeerReview,
  getPeerReviews: packStore.getPeerReviews,
  getPeerReview: packStore.getPeerReview,
  getFeedback: feedbackStore.getFeedback,
  getFeedbackContext: feedbackStore.getFeedbackContext,
  getFeedbackTimeline: feedbackStore.getFeedbackTimeline,
  getFeedbackNote: feedbackStore.getFeedbackNote,
  setFeedbackNote: feedbackStore.setFeedbackNote,
};
