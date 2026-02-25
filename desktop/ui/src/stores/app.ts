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
  ProjectUpdatePayload,
  ProjectUpdateRequestSchema,
  ProjectIdPayloadSchema,
  ProjectListItem,
  ProjectListResponseSchema,
  ProjectSummary,
  ProjectSummaryNullableSchema,
  OutlineGetPayloadSchema,
  OutlineSetPayloadSchema,
  OutlineDocSchema,
  ExportOutlinePayloadSchema,
  ExportResultSchema,
  OutlineDoc,
  ExportResult,
  PackExportPayloadSchema,
  PackInspectPayloadSchema,
  PackInspectResponseSchema,
  PeerReviewListPayloadSchema,
  PeerReviewSummary,
  PeerReviewSummarySchema,
  PeerReviewDetail,
  PeerReviewDetailSchema,
  PeerReviewGetPayloadSchema,
  PeerReviewImportPayloadSchema,
  PeerReviewImportResponseSchema,
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
  QuestDailySchema,
  QuestSchema,
  QuestListPayloadSchema,
  QuestListResponseSchema,
  QuestGetByCodePayloadSchema,
  QuestGetDailyPayloadSchema,
  Quest,
  QuestSubmitTextPayloadSchema,
  QuestSubmitAudioPayloadSchema,
  QuestAttemptsListPayloadSchema,
  QuestAttemptSummary,
  QuestAttemptListResponseSchema,
  QuestReportPayloadSchema,
  QuestReportResponseSchema,
  QuestReportItem,
  AnalyzeAttemptPayloadSchema,
  AnalyzeResponseSchema,
  FeedbackGetPayloadSchema,
  FeedbackV1,
  FeedbackV1Schema,
  FeedbackContextPayloadSchema,
  FeedbackContextSchema,
  FeedbackContext,
  FeedbackNoteGetPayloadSchema,
  FeedbackNoteResponseSchema,
  FeedbackNoteSetPayloadSchema,
  VoidResponseSchema,
} from "../schemas/ipc";

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

let bootstrapPromise: Promise<void> | null = null;

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
  state.trainingProjectId = null;
}

async function loadProjects() {
  if (!state.activeProfileId) {
    state.projects = [];
    return;
  }
  const projects = await invokeChecked(
    "project_list",
    ProfileIdPayloadSchema,
    ProjectListResponseSchema,
    { profileId: state.activeProfileId }
  );
  state.projects = projects;
}

async function ensureTrainingProject() {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  if (state.trainingProjectId) {
    return state.trainingProjectId;
  }
  const id = await invokeChecked(
    "project_ensure_training",
    ProfileIdPayloadSchema,
    IdSchema,
    { profileId: state.activeProfileId }
  );
  state.trainingProjectId = id;
  return id;
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
  await loadProjects();
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
  await loadProjects();
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
  await loadProjects();
  await loadDailyQuest();
  return id;
}

async function updateProject(projectId: string, payload: ProjectUpdatePayload) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  await invokeChecked(
    "project_update",
    ProjectUpdateRequestSchema,
    VoidResponseSchema,
    { profileId: state.activeProfileId, projectId, payload }
  );
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
  await invokeChecked(
    "project_set_active",
    ProjectIdPayloadSchema,
    VoidResponseSchema,
    { profileId: state.activeProfileId, projectId }
  );
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
  return invokeChecked(
    "quest_attempts_list",
    QuestAttemptsListPayloadSchema,
    QuestAttemptListResponseSchema,
    {
      profileId: state.activeProfileId,
      projectId,
      limit,
    }
  );
}

async function getDailyQuestForProject(projectId: string): Promise<QuestDaily> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "quest_get_daily",
    QuestGetDailyPayloadSchema,
    QuestDailySchema,
    {
      profileId: state.activeProfileId,
      projectId,
    }
  );
}

async function getQuestReport(projectId: string): Promise<QuestReportItem[]> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "quest_report",
    QuestReportPayloadSchema,
    QuestReportResponseSchema,
    { profileId: state.activeProfileId, projectId }
  );
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
  const attemptId = await invokeChecked(
    "quest_submit_text",
    QuestSubmitTextPayloadSchema,
    IdSchema,
    {
      profileId: state.activeProfileId,
      projectId,
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
  const attemptId = await invokeChecked(
    "quest_submit_audio",
    QuestSubmitAudioPayloadSchema,
    IdSchema,
    {
      profileId: state.activeProfileId,
      projectId,
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

async function getQuestList(): Promise<Quest[]> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "quest_list",
    QuestListPayloadSchema,
    QuestListResponseSchema,
    { profileId: state.activeProfileId }
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
  return invokeChecked("outline_get", OutlineGetPayloadSchema, OutlineDocSchema, {
    profileId: state.activeProfileId,
    projectId,
  });
}

async function saveOutline(projectId: string, markdown: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  await invokeChecked("outline_set", OutlineSetPayloadSchema, VoidResponseSchema, {
    profileId: state.activeProfileId,
    projectId,
    markdown,
  });
}

async function exportOutline(projectId: string): Promise<ExportResult> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked("export_outline", ExportOutlinePayloadSchema, ExportResultSchema, {
    profileId: state.activeProfileId,
    projectId,
  });
}

async function exportPack(runId: string): Promise<ExportResult> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked("pack_export", PackExportPayloadSchema, ExportResultSchema, {
    profileId: state.activeProfileId,
    runId,
  });
}

async function inspectPack(path: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked("pack_inspect", PackInspectPayloadSchema, PackInspectResponseSchema, {
    profileId: state.activeProfileId,
    path,
  });
}

async function importPeerReview(path: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  const response = await invokeChecked(
    "peer_review_import",
    PeerReviewImportPayloadSchema,
    PeerReviewImportResponseSchema,
    {
      profileId: state.activeProfileId,
      path,
    }
  );
  return response;
}

async function getPeerReviews(
  projectId: string,
  limit = 12
): Promise<PeerReviewSummary[]> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "peer_review_list",
    PeerReviewListPayloadSchema,
    PeerReviewSummarySchema.array(),
    { profileId: state.activeProfileId, projectId, limit }
  );
}

async function getPeerReview(peerReviewId: string): Promise<PeerReviewDetail> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "peer_review_get",
    PeerReviewGetPayloadSchema,
    PeerReviewDetailSchema,
    { profileId: state.activeProfileId, peerReviewId }
  );
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

async function getFeedbackContext(feedbackId: string): Promise<FeedbackContext> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  const context = await invokeChecked(
    "feedback_context_get",
    FeedbackContextPayloadSchema,
    FeedbackContextSchema,
    { profileId: state.activeProfileId, feedbackId }
  );
  state.lastFeedbackContext = context;
  return context;
}

async function getFeedbackNote(feedbackId: string): Promise<string | null> {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return invokeChecked(
    "feedback_note_get",
    FeedbackNoteGetPayloadSchema,
    FeedbackNoteResponseSchema,
    { profileId: state.activeProfileId, feedbackId }
  );
}

async function setFeedbackNote(feedbackId: string, note: string) {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  await invokeChecked(
    "feedback_note_set",
    FeedbackNoteSetPayloadSchema,
    VoidResponseSchema,
    { profileId: state.activeProfileId, feedbackId, note }
  );
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
    await loadProjects();
    await loadDailyQuest();
  },
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
  getFeedbackNote,
  setFeedbackNote,
};
