import { reactive } from "vue";
import { invokeChecked } from "../composables/useIpc";
import {
  EmptyPayloadSchema,
  IdSchema,
  ProfileCreatePayloadSchema,
  ProfileIdPayloadSchema,
  ProfileListResponseSchema,
  ProfileRenamePayloadSchema,
  ProfileSummary,
  ProjectCreateRequestSchema,
  ProjectSummary,
  ProjectSummaryNullableSchema,
  QuestDaily,
  QuestDailySchema,
  QuestSchema,
  QuestGetByCodePayloadSchema,
  QuestGetDailyPayloadSchema,
  Quest,
  QuestSubmitTextPayloadSchema,
  QuestSubmitAudioPayloadSchema,
  AnalyzeAttemptPayloadSchema,
  AnalyzeResponseSchema,
  FeedbackGetPayloadSchema,
  FeedbackV1,
  FeedbackV1Schema,
  VoidResponseSchema,
} from "../schemas/ipc";

const state = reactive({
  profiles: [] as ProfileSummary[],
  activeProfileId: null as string | null,
  activeProject: null as ProjectSummary | null,
  dailyQuest: null as QuestDaily | null,
  lastAttemptId: null as string | null,
  lastFeedbackId: null as string | null,
});

async function loadProfiles() {
  const profiles = await invokeChecked(
    "profile_list",
    EmptyPayloadSchema,
    ProfileListResponseSchema,
    {}
  );
  state.profiles = profiles;
  const active = profiles.find((profile) => profile.is_active);
  state.activeProfileId = active?.id ?? null;
}

async function createProfile(name: string) {
  const id = await invokeChecked(
    "profile_create",
    ProfileCreatePayloadSchema,
    IdSchema,
    { name }
  );
  await loadProfiles();
  state.activeProfileId = id;
  await loadActiveProject();
  await loadDailyQuest();
  return id;
}

async function switchProfile(profileId: string) {
  await invokeChecked(
    "profile_switch",
    ProfileIdPayloadSchema,
    VoidResponseSchema,
    { profileId }
  );
  await loadProfiles();
  await loadActiveProject();
  await loadDailyQuest();
}

async function loadActiveProject() {
  if (!state.activeProfileId) {
    state.activeProject = null;
    return;
  }
  const activeProject = await invokeChecked(
    "project_get_active",
    ProfileIdPayloadSchema,
    ProjectSummaryNullableSchema,
    { profileId: state.activeProfileId }
  );
  state.activeProject = activeProject;
}

async function createProject(payload: {
  title: string;
  audience?: string | null;
  goal?: string | null;
  duration_target_sec?: number | null;
}) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  const id = await invokeChecked(
    "project_create",
    ProjectCreateRequestSchema,
    IdSchema,
    { profileId: state.activeProfileId, payload }
  );
  await loadActiveProject();
  await loadDailyQuest();
  return id;
}

async function loadDailyQuest() {
  if (!state.activeProfileId || !state.activeProject) {
    state.dailyQuest = null;
    return;
  }
  const quest = await invokeChecked(
    "quest_get_daily",
    QuestGetDailyPayloadSchema,
    QuestDailySchema,
    {
      profileId: state.activeProfileId,
      projectId: state.activeProject.id,
    }
  );
  state.dailyQuest = quest;
}

async function submitQuestText(questCode: string, text: string) {
  if (!state.activeProfileId || !state.activeProject) {
    throw new Error("quest_context_missing");
  }
  const attemptId = await invokeChecked(
    "quest_submit_text",
    QuestSubmitTextPayloadSchema,
    IdSchema,
    {
      profileId: state.activeProfileId,
      projectId: state.activeProject.id,
      questCode,
      text,
    }
  );
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
  const attemptId = await invokeChecked(
    "quest_submit_audio",
    QuestSubmitAudioPayloadSchema,
    IdSchema,
    {
      profileId: state.activeProfileId,
      projectId: state.activeProject.id,
      questCode: payload.questCode,
      audioArtifactId: payload.audioArtifactId,
      transcriptId: payload.transcriptId ?? null,
    }
  );
  state.lastAttemptId = attemptId;
  return attemptId;
}

async function getQuestByCode(questCode: string): Promise<Quest> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "quest_get_by_code",
    QuestGetByCodePayloadSchema,
    QuestSchema,
    { profileId: state.activeProfileId, questCode }
  );
}

async function analyzeAttempt(attemptId: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  const response = await invokeChecked(
    "analyze_attempt",
    AnalyzeAttemptPayloadSchema,
    AnalyzeResponseSchema,
    { profileId: state.activeProfileId, attemptId }
  );
  state.lastFeedbackId = response.feedbackId;
  return response.feedbackId;
}

async function getFeedback(feedbackId: string): Promise<FeedbackV1> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "feedback_get",
    FeedbackGetPayloadSchema,
    FeedbackV1Schema,
    { profileId: state.activeProfileId, feedbackId }
  );
}

async function bootstrap() {
  await loadProfiles();
  await loadActiveProject();
  await loadDailyQuest();
}

export const appStore = {
  state,
  bootstrap,
  loadProfiles,
  createProfile,
  async renameProfile(profileId: string, name: string) {
    await invokeChecked(
      "profile_rename",
      ProfileRenamePayloadSchema,
      VoidResponseSchema,
      { profileId, name }
    );
    await loadProfiles();
  },
  async deleteProfile(profileId: string) {
    await invokeChecked(
      "profile_delete",
      ProfileIdPayloadSchema,
      VoidResponseSchema,
      { profileId }
    );
    await loadProfiles();
    await loadActiveProject();
    await loadDailyQuest();
  },
  switchProfile,
  loadActiveProject,
  createProject,
  loadDailyQuest,
  submitQuestText,
  submitQuestAudio,
  getQuestByCode,
  analyzeAttempt,
  getFeedback,
};
