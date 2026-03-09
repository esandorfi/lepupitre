import {
  getDailyQuest as getDailyQuestFromApi,
  getQuestAttempts as getQuestAttemptsFromApi,
  getQuestByCode as getQuestByCodeFromApi,
  getQuestList as getQuestListFromApi,
  getQuestReport as getQuestReportFromApi,
  submitQuestAudio as submitQuestAudioFromApi,
  submitQuestText as submitQuestTextFromApi,
} from "../domains/quest/api";
import type {
  Quest,
  QuestAttemptSummary,
  QuestDaily,
  QuestReportItem,
} from "../schemas/ipc";
import type { AppState } from "./appState";

function requireActiveProfileId(state: AppState): string {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return state.activeProfileId;
}

/**
 * Creates and returns the create training store contract.
 */
export function createTrainingStore(
  state: AppState,
  dependencies: {
    ensureTrainingProject: () => Promise<string>;
    getTalkNumber: (projectId: string) => number | null;
  }
) {
  async function loadDailyQuest() {
    if (!state.activeProfileId || !state.activeProject) {
      state.dailyQuest = null;
      return;
    }
    const quest = await getDailyQuestForProject(state.activeProject.id);
    state.dailyQuest = quest;
  }

  async function loadRecentAttempts(limit = 6) {
    if (!state.activeProfileId || !state.activeProject) {
      state.recentAttempts = [];
      return;
    }
    const attempts = await getQuestAttempts(state.activeProject.id, limit);
    state.recentAttempts = attempts;
  }

  async function getQuestAttempts(projectId: string, limit = 10): Promise<QuestAttemptSummary[]> {
    const profileId = requireActiveProfileId(state);
    return getQuestAttemptsFromApi(profileId, projectId, limit);
  }

  async function getDailyQuestForProject(projectId: string): Promise<QuestDaily> {
    const profileId = requireActiveProfileId(state);
    return getDailyQuestFromApi(profileId, projectId);
  }

  async function submitQuestText(questCode: string, text: string) {
    if (!state.activeProfileId || !state.activeProject) {
      throw new Error("quest_context_missing");
    }
    return submitQuestTextForProject(state.activeProject.id, questCode, text);
  }

  async function submitQuestTextForProject(projectId: string, questCode: string, text: string) {
    const profileId = requireActiveProfileId(state);
    const attemptId = await submitQuestTextFromApi(profileId, projectId, questCode, text);
    state.lastAttemptId = attemptId;
    return attemptId;
  }

  async function submitQuestAudio(payload: {
    questCode: string;
    audioArtifactId: string;
    transcriptId?: string | null;
  }) {
    if (!state.activeProfileId || !state.activeProject) {
      throw new Error("quest_context_missing");
    }
    return submitQuestAudioForProject(state.activeProject.id, payload);
  }

  async function submitQuestAudioForProject(
    projectId: string,
    payload: {
      questCode: string;
      audioArtifactId: string;
      transcriptId?: string | null;
    }
  ) {
    const profileId = requireActiveProfileId(state);
    const attemptId = await submitQuestAudioFromApi(profileId, projectId, payload);
    state.lastAttemptId = attemptId;
    return attemptId;
  }

  async function getQuestByCode(questCode: string): Promise<Quest> {
    const profileId = requireActiveProfileId(state);
    return getQuestByCodeFromApi(profileId, questCode);
  }

  async function getQuestList(): Promise<Quest[]> {
    const profileId = requireActiveProfileId(state);
    return getQuestListFromApi(profileId);
  }

  async function getQuestReport(projectId: string): Promise<QuestReportItem[]> {
    const profileId = requireActiveProfileId(state);
    return getQuestReportFromApi(profileId, projectId);
  }

  function formatQuestCode(projectId: string, questCode: string): string {
    if (!questCode) {
      return "";
    }
    const number = dependencies.getTalkNumber(projectId);
    if (!number) {
      return questCode;
    }
    return `T${number}-${questCode}`;
  }

  async function ensureTrainingProject() {
    return dependencies.ensureTrainingProject();
  }

  return {
    ensureTrainingProject,
    loadDailyQuest,
    loadRecentAttempts,
    getQuestAttempts,
    getDailyQuestForProject,
    submitQuestText,
    submitQuestTextForProject,
    submitQuestAudio,
    submitQuestAudioForProject,
    getQuestByCode,
    getQuestList,
    getQuestReport,
    formatQuestCode,
  };
}

