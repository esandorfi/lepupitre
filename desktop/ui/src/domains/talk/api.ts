import { invokeChecked } from "../../composables/useIpc";
import {
  ExportOutlinePayloadSchema,
  ExportResult,
  ExportResultSchema,
  IdSchema,
  OutlineDoc,
  OutlineDocSchema,
  OutlineGetPayloadSchema,
  OutlineSetPayloadSchema,
  ProfileIdPayloadSchema,
  ProjectCreateRequestSchema,
  ProjectIdPayloadSchema,
  ProjectListItem,
  ProjectListResponseSchema,
  ProjectSummary,
  ProjectSummaryNullableSchema,
  ProjectUpdatePayload,
  ProjectUpdateRequestSchema,
  VoidResponseSchema,
} from "../../schemas/ipc";

export async function listProjects(profileId: string): Promise<ProjectListItem[]> {
  return invokeChecked("project_list", ProfileIdPayloadSchema, ProjectListResponseSchema, {
    profileId,
  });
}

export async function ensureTrainingProject(profileId: string) {
  return invokeChecked("project_ensure_training", ProfileIdPayloadSchema, IdSchema, { profileId });
}

export async function getActiveProject(profileId: string): Promise<ProjectSummary | null> {
  return invokeChecked("project_get_active", ProfileIdPayloadSchema, ProjectSummaryNullableSchema, {
    profileId,
  });
}

export async function createProject(
  profileId: string,
  payload: {
    title: string;
    audience?: string | null;
    goal?: string | null;
    duration_target_sec?: number | null;
  }
) {
  return invokeChecked("project_create", ProjectCreateRequestSchema, IdSchema, {
    profileId,
    payload,
  });
}

export async function updateProject(
  profileId: string,
  projectId: string,
  payload: ProjectUpdatePayload
) {
  await invokeChecked("project_update", ProjectUpdateRequestSchema, VoidResponseSchema, {
    profileId,
    projectId,
    payload,
  });
}

export async function setActiveProject(profileId: string, projectId: string) {
  await invokeChecked("project_set_active", ProjectIdPayloadSchema, VoidResponseSchema, {
    profileId,
    projectId,
  });
}

export async function getOutline(profileId: string, projectId: string): Promise<OutlineDoc> {
  return invokeChecked("outline_get", OutlineGetPayloadSchema, OutlineDocSchema, {
    profileId,
    projectId,
  });
}

export async function saveOutline(profileId: string, projectId: string, markdown: string) {
  await invokeChecked("outline_set", OutlineSetPayloadSchema, VoidResponseSchema, {
    profileId,
    projectId,
    markdown,
  });
}

export async function exportOutline(profileId: string, projectId: string): Promise<ExportResult> {
  return invokeChecked("export_outline", ExportOutlinePayloadSchema, ExportResultSchema, {
    profileId,
    projectId,
  });
}
