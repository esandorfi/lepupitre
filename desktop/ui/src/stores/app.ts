import { reactive } from "vue";
import { invokeChecked } from "../composables/useIpc";
import {
  createProfile as createWorkspaceProfile,
  deleteProfile as deleteWorkspaceProfile,
  listProfiles as listWorkspaceProfiles,
  renameProfile as renameWorkspaceProfile,
  switchProfile as switchWorkspaceProfile,
} from "../domains/workspace/api";
import {
  getDailyQuest as getDailyQuestFromApi,
  getQuestAttempts as getQuestAttemptsFromApi,
  getQuestByCode as getQuestByCodeFromApi,
  getQuestList as getQuestListFromApi,
  getQuestReport as getQuestReportFromApi,
  submitQuestAudio as submitQuestAudioFromApi,
  submitQuestText as submitQuestTextFromApi,
} from "../domains/quest/api";
import {
  analyzeAttempt as analyzeAttemptFromApi,
  getFeedback as getFeedbackFromApi,
  getFeedbackContext as getFeedbackContextFromApi,
  getFeedbackNote as getFeedbackNoteFromApi,
  getFeedbackTimeline as getFeedbackTimelineFromApi,
  setFeedbackNote as setFeedbackNoteFromApi,
} from "../domains/feedback/api";
import {
  createProject as createTalkProjectFromApi,
  ensureTrainingProject as ensureTrainingProjectFromApi,
  exportOutline as exportTalkOutlineFromApi,
  getActiveProject as getActiveTalkProjectFromApi,
  getOutline as getTalkOutlineFromApi,
  listProjects as listTalkProjectsFromApi,
  saveOutline as saveTalkOutlineFromApi,
  setActiveProject as setActiveTalkProjectFromApi,
  updateProject as updateTalkProjectFromApi,
} from "../domains/talk/api";
import {
  exportPack as exportPackFromApi,
  getPeerReview as getPeerReviewFromApi,
  getPeerReviews as getPeerReviewsFromApi,
  importPeerReview as importPeerReviewFromApi,
  inspectPack as inspectPackFromApi,
} from "../domains/pack/api";
import {
  IdSchema,
  ProfileSummary,
  ProjectUpdatePayload,
  ProjectListItem,
  ProjectSummary,
  OutlineDoc,
  ExportResult,
  PeerReviewSummary,
  PeerReviewDetail,
  RunAnalyzePayloadSchema,
  RunCreatePayloadSchema,
  RunFinishPayloadSchema,
  RunGetPayloadSchema,
  RunListPayloadSchema,
  RunLatestPayloadSchema,
  RunSetTranscriptPayloadSchema,
  RunSummary,
  RunSummaryListSchema,
  RunSummaryNullableSchema,
  QuestDaily,
  ProgressSnapshot,
  ProgressSnapshotPayloadSchema,
  ProgressSnapshotSchema,
  Quest,
  QuestAttemptSummary,
  QuestReportItem,
  FeedbackV1,
  FeedbackContext,
  FeedbackTimelineItem,
  MascotMessage,
  MascotMessagePayloadSchema,
  MascotMessageSchema,
  TalksBlueprint,
  TalksBlueprintPayloadSchema,
  TalksBlueprintSchema,
  VoidResponseSchema,
} from "../schemas/ipc";
import { hydratePreferences, setActivePreferenceProfile } from "../lib/preferencesStorage";

const state = reactive({
  profiles: [] as ProfileSummary[],
  activeProfileId: null as string | null,
  hasBootstrapped: false,
  isBootstrapping: false,
  activeProject: null as ProjectSummary | null,
  trainingProjectId: null as string | null,
  projects: [] as ProjectListItem[],
  dailyQuest: null as QuestDaily | null,
  recentAttempts: [] as QuestAttemptSummary[],
  lastAttemptId: null as string | null,
  lastFeedbackId: null as string | null,
  lastFeedbackContext: null as FeedbackContext | null,
});

const GLOBAL_PREFERENCE_KEYS = [
  "lepupitre_ui_settings_v1",
  "lepupitre_theme",
  "lepupitre_transcription_settings",
  "lepupitre_locale",
  "lepupitre_nav_metrics_v1",
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

let bootstrapPromise: Promise<void> | null = null;

async function loadProfiles() {
  const profiles = await listWorkspaceProfiles();
  state.profiles = profiles;
  const active = profiles.find((profile) => profile.is_active);
  state.activeProfileId = active?.id ?? null;
  state.trainingProjectId = null;
  setActivePreferenceProfile(state.activeProfileId);
  await hydratePreferenceContext(state.activeProfileId);
}

async function loadProjects() {
  if (!state.activeProfileId) {
    state.projects = [];
    return;
  }
  const projects = await listTalkProjectsFromApi(state.activeProfileId);
  state.projects = projects;
}

async function ensureTrainingProject() {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  if (state.trainingProjectId) {
    return state.trainingProjectId;
  }
  const id = await ensureTrainingProjectFromApi(state.activeProfileId);
  state.trainingProjectId = id;
  return id;
}

async function createProfile(name: string) {
  const id = await createWorkspaceProfile(name);
  await loadProfiles();
  state.activeProfileId = id;
  await loadActiveProject();
  await loadProjects();
  await loadDailyQuest();
  return id;
}

async function switchProfile(profileId: string) {
  await switchWorkspaceProfile(profileId);
  await loadProfiles();
  await loadActiveProject();
  await loadProjects();
  await loadDailyQuest();
}

async function renameProfile(profileId: string, name: string) {
  await renameWorkspaceProfile(profileId, name);
  await loadProfiles();
}

async function deleteProfile(profileId: string) {
  await deleteWorkspaceProfile(profileId);
  await loadProfiles();
  await loadActiveProject();
  await loadProjects();
  await loadDailyQuest();
}

async function loadActiveProject() {
  if (!state.activeProfileId) {
    state.activeProject = null;
    return;
  }
  const activeProject = await getActiveTalkProjectFromApi(state.activeProfileId);
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
  const id = await createTalkProjectFromApi(state.activeProfileId, payload);
  await loadActiveProject();
  await loadProjects();
  await loadDailyQuest();
  return id;
}

async function updateProject(projectId: string, payload: ProjectUpdatePayload) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  await updateTalkProjectFromApi(state.activeProfileId, projectId, payload);
  await loadProjects();
  if (state.activeProject?.id === projectId) {
    await loadActiveProject();
  }
}

function stageRank(stage: string | null | undefined) {
  switch (stage) {
    case "builder":
      return 1;
    case "train":
      return 2;
    case "export":
      return 3;
    case "draft":
    default:
      return 0;
  }
}

async function ensureProjectStageAtLeast(
  projectId: string,
  minimumStage: "draft" | "builder" | "train" | "export"
) {
  const project =
    state.projects.find((item) => item.id === projectId) ??
    (state.activeProject?.id === projectId ? state.activeProject : null);
  if (!project) {
    throw new Error("project_not_found");
  }
  if (stageRank(project.stage) >= stageRank(minimumStage)) {
    return;
  }
  await updateProject(projectId, {
    title: project.title,
    audience: project.audience ?? null,
    goal: project.goal ?? null,
    duration_target_sec: project.duration_target_sec ?? null,
    stage: minimumStage,
  });
}

async function setActiveProject(projectId: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  await setActiveTalkProjectFromApi(state.activeProfileId, projectId);
  await loadActiveProject();
  await loadProjects();
  await loadDailyQuest();
}

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

async function getQuestAttempts(projectId: string, limit = 10) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getQuestAttemptsFromApi(state.activeProfileId, projectId, limit);
}

async function getDailyQuestForProject(projectId: string): Promise<QuestDaily> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getDailyQuestFromApi(state.activeProfileId, projectId);
}

async function getProgressSnapshot(projectId?: string | null): Promise<ProgressSnapshot> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "progress_get_snapshot",
    ProgressSnapshotPayloadSchema,
    ProgressSnapshotSchema,
    {
      profileId: state.activeProfileId,
      projectId: projectId ?? null,
    }
  );
}

async function getMascotContextMessage(payload: {
  routeName: string;
  projectId?: string | null;
  locale?: string | null;
}): Promise<MascotMessage> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "mascot_get_context_message",
    MascotMessagePayloadSchema,
    MascotMessageSchema,
    {
      profileId: state.activeProfileId,
      routeName: payload.routeName,
      projectId: payload.projectId ?? null,
      locale: payload.locale ?? null,
    }
  );
}

async function getTalksBlueprint(
  projectId: string,
  locale?: string | null
): Promise<TalksBlueprint> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "talks_get_blueprint",
    TalksBlueprintPayloadSchema,
    TalksBlueprintSchema,
    {
      profileId: state.activeProfileId,
      projectId,
      locale: locale ?? null,
    }
  );
}

async function getQuestReport(projectId: string): Promise<QuestReportItem[]> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getQuestReportFromApi(state.activeProfileId, projectId);
}

function getTalkNumber(projectId: string): number | null {
  if (!projectId) {
    return null;
  }
  const project = state.projects.find((item) => item.id === projectId);
  if (project?.talk_number) {
    return project.talk_number;
  }
  if (state.activeProject?.id === projectId) {
    return state.activeProject.talk_number ?? null;
  }
  return null;
}

function formatQuestCode(projectId: string, questCode: string): string {
  if (!questCode) {
    return "";
  }
  const number = getTalkNumber(projectId);
  if (!number) {
    return questCode;
  }
  return `T${number}-${questCode}`;
}

async function submitQuestText(questCode: string, text: string) {
  if (!state.activeProfileId || !state.activeProject) {
    throw new Error("quest_context_missing");
  }
  return submitQuestTextForProject(state.activeProject.id, questCode, text);
}

async function submitQuestTextForProject(projectId: string, questCode: string, text: string) {
  if (!state.activeProfileId) {
    throw new Error("quest_context_missing");
  }
  const attemptId = await submitQuestTextFromApi(state.activeProfileId, projectId, questCode, text);
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
  if (!state.activeProfileId) {
    throw new Error("quest_context_missing");
  }
  const attemptId = await submitQuestAudioFromApi(state.activeProfileId, projectId, payload);
  state.lastAttemptId = attemptId;
  return attemptId;
}

async function getQuestByCode(questCode: string): Promise<Quest> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getQuestByCodeFromApi(state.activeProfileId, questCode);
}

async function getQuestList(): Promise<Quest[]> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getQuestListFromApi(state.activeProfileId);
}

async function analyzeAttempt(attemptId: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  const response = await analyzeAttemptFromApi(state.activeProfileId, attemptId);
  state.lastFeedbackId = response.feedbackId;
  return response.feedbackId;
}

async function createRun(projectId: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked("run_create", RunCreatePayloadSchema, IdSchema, {
    profileId: state.activeProfileId,
    projectId,
  });
}

async function finishRun(runId: string, audioArtifactId: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  await invokeChecked("run_finish", RunFinishPayloadSchema, VoidResponseSchema, {
    profileId: state.activeProfileId,
    runId,
    audioArtifactId,
  });
}

async function setRunTranscript(runId: string, transcriptId: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  await invokeChecked("run_set_transcript", RunSetTranscriptPayloadSchema, VoidResponseSchema, {
    profileId: state.activeProfileId,
    runId,
    transcriptId,
  });
}

async function analyzeRun(runId: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  const response = await invokeChecked(
    "run_analyze",
    RunAnalyzePayloadSchema,
    AnalyzeResponseSchema,
    { profileId: state.activeProfileId, runId }
  );
  state.lastFeedbackId = response.feedbackId;
  return response.feedbackId;
}

async function getLatestRun(projectId: string): Promise<RunSummary | null> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "run_get_latest",
    RunLatestPayloadSchema,
    RunSummaryNullableSchema,
    { profileId: state.activeProfileId, projectId }
  );
}

async function getRun(runId: string): Promise<RunSummary | null> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked("run_get", RunGetPayloadSchema, RunSummaryNullableSchema, {
    profileId: state.activeProfileId,
    runId,
  });
}

async function getRuns(projectId: string, limit = 12): Promise<RunSummary[]> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked("run_list", RunListPayloadSchema, RunSummaryListSchema, {
    profileId: state.activeProfileId,
    projectId,
    limit,
  });
}

async function getOutline(projectId: string): Promise<OutlineDoc> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getTalkOutlineFromApi(state.activeProfileId, projectId);
}

async function saveOutline(projectId: string, markdown: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  await saveTalkOutlineFromApi(state.activeProfileId, projectId, markdown);
}

async function exportOutline(projectId: string): Promise<ExportResult> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return exportTalkOutlineFromApi(state.activeProfileId, projectId);
}

async function exportPack(runId: string): Promise<ExportResult> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return exportPackFromApi(state.activeProfileId, runId);
}

async function inspectPack(path: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return inspectPackFromApi(state.activeProfileId, path);
}

async function importPeerReview(path: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return importPeerReviewFromApi(state.activeProfileId, path);
}

async function getPeerReviews(
  projectId: string,
  limit = 12
): Promise<PeerReviewSummary[]> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getPeerReviewsFromApi(state.activeProfileId, projectId, limit);
}

async function getPeerReview(peerReviewId: string): Promise<PeerReviewDetail> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getPeerReviewFromApi(state.activeProfileId, peerReviewId);
}

async function getFeedback(feedbackId: string): Promise<FeedbackV1> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getFeedbackFromApi(state.activeProfileId, feedbackId);
}

async function getFeedbackContext(feedbackId: string): Promise<FeedbackContext> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  const context = await getFeedbackContextFromApi(state.activeProfileId, feedbackId);
  state.lastFeedbackContext = context;
  return context;
}

async function getFeedbackTimeline(
  projectId?: string | null,
  limit?: number | null
): Promise<FeedbackTimelineItem[]> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getFeedbackTimelineFromApi(state.activeProfileId, projectId, limit);
}

async function getFeedbackNote(feedbackId: string): Promise<string | null> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return getFeedbackNoteFromApi(state.activeProfileId, feedbackId);
}

async function setFeedbackNote(feedbackId: string, note: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  await setFeedbackNoteFromApi(state.activeProfileId, feedbackId, note);
}

async function bootstrap() {
  if (state.hasBootstrapped) {
    return;
  }
  if (bootstrapPromise) {
    return bootstrapPromise;
  }
  state.isBootstrapping = true;
  bootstrapPromise = (async () => {
    await loadProfiles();
    await loadActiveProject();
    await loadProjects();
    await loadDailyQuest();
    state.hasBootstrapped = true;
  })()
    .finally(() => {
      state.isBootstrapping = false;
      bootstrapPromise = null;
    });
  return bootstrapPromise;
}

async function ensureBootstrapped() {
  return bootstrap();
}

export const appStore = {
  state,
  bootstrap,
  ensureBootstrapped,
  loadProfiles,
  loadProjects,
  createProfile,
  renameProfile,
  deleteProfile,
  switchProfile,
  loadActiveProject,
  createProject,
  updateProject,
  ensureProjectStageAtLeast,
  setActiveProject,
  ensureTrainingProject,
  loadDailyQuest,
  loadRecentAttempts,
  getDailyQuestForProject,
  getProgressSnapshot,
  getMascotContextMessage,
  getTalksBlueprint,
  getQuestAttempts,
  submitQuestText,
  submitQuestTextForProject,
  submitQuestAudio,
  submitQuestAudioForProject,
  getQuestByCode,
  getQuestList,
  getQuestReport,
  getTalkNumber,
  formatQuestCode,
  analyzeAttempt,
  createRun,
  finishRun,
  setRunTranscript,
  analyzeRun,
  getLatestRun,
  getRun,
  getRuns,
  getOutline,
  saveOutline,
  exportOutline,
  exportPack,
  inspectPack,
  importPeerReview,
  getPeerReviews,
  getPeerReview,
  getFeedback,
  getFeedbackContext,
  getFeedbackTimeline,
  getFeedbackNote,
  setFeedbackNote,
};
