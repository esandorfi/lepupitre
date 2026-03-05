import {
  createProject as createTalkProjectFromApi,
  getActiveProject as getActiveTalkProjectFromApi,
  listProjects as listTalkProjectsFromApi,
  setActiveProject as setActiveTalkProjectFromApi,
  updateProject as updateTalkProjectFromApi,
  ensureTrainingProject as ensureTrainingProjectFromApi,
  getOutline as getTalkOutlineFromApi,
  saveOutline as saveTalkOutlineFromApi,
  exportOutline as exportTalkOutlineFromApi,
} from "../domains/talk/api";
import type { ExportResult, OutlineDoc, ProjectUpdatePayload } from "../schemas/ipc";
import type { AppState } from "./appState";

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

function requireActiveProfileId(state: AppState): string {
  if (!state.activeProfileId) {
    throw new Error("no_active_profile");
  }
  return state.activeProfileId;
}

export function createTalksStore(state: AppState) {
  async function loadProjects() {
    if (!state.activeProfileId) {
      state.projects = [];
      return;
    }
    const projects = await listTalkProjectsFromApi(state.activeProfileId);
    state.projects = projects;
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
    const profileId = requireActiveProfileId(state);
    const id = await createTalkProjectFromApi(profileId, payload);
    await loadActiveProject();
    await loadProjects();
    return id;
  }

  async function updateProject(projectId: string, payload: ProjectUpdatePayload) {
    const profileId = requireActiveProfileId(state);
    await updateTalkProjectFromApi(profileId, projectId, payload);
    await loadProjects();
    if (state.activeProject?.id === projectId) {
      await loadActiveProject();
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
    const profileId = requireActiveProfileId(state);
    await setActiveTalkProjectFromApi(profileId, projectId);
    await loadActiveProject();
    await loadProjects();
  }

  async function ensureTrainingProject() {
    const profileId = requireActiveProfileId(state);
    if (state.trainingProjectId) {
      return state.trainingProjectId;
    }
    const id = await ensureTrainingProjectFromApi(profileId);
    state.trainingProjectId = id;
    return id;
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

  async function getOutline(projectId: string): Promise<OutlineDoc> {
    const profileId = requireActiveProfileId(state);
    return getTalkOutlineFromApi(profileId, projectId);
  }

  async function saveOutline(projectId: string, markdown: string) {
    const profileId = requireActiveProfileId(state);
    await saveTalkOutlineFromApi(profileId, projectId, markdown);
  }

  async function exportOutline(projectId: string): Promise<ExportResult> {
    const profileId = requireActiveProfileId(state);
    return exportTalkOutlineFromApi(profileId, projectId);
  }

  return {
    loadProjects,
    loadActiveProject,
    createProject,
    updateProject,
    ensureProjectStageAtLeast,
    setActiveProject,
    ensureTrainingProject,
    getTalkNumber,
    getOutline,
    saveOutline,
    exportOutline,
  };
}

