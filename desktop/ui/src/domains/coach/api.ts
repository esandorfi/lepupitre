import { invokeChecked } from "@/composables/useIpc";
import {
  MascotMessage,
  MascotMessagePayloadSchema,
  MascotMessageSchema,
  ProgressSnapshot,
  ProgressSnapshotPayloadSchema,
  ProgressSnapshotSchema,
  TalksBlueprint,
  TalksBlueprintPayloadSchema,
  TalksBlueprintSchema,
} from "@/schemas/ipc";

/**
 * Retrieves get progress snapshot from domain/runtime dependencies.
 */
export async function getProgressSnapshot(
  profileId: string,
  projectId?: string | null
): Promise<ProgressSnapshot> {
  return invokeChecked(
    "progress_get_snapshot",
    ProgressSnapshotPayloadSchema,
    ProgressSnapshotSchema,
    {
      profileId,
      projectId: projectId ?? null,
    }
  );
}

/**
 * Retrieves get mascot context message from domain/runtime dependencies.
 */
export async function getMascotContextMessage(
  profileId: string,
  payload: {
    routeName: string;
    projectId?: string | null;
    locale?: string | null;
  }
): Promise<MascotMessage> {
  return invokeChecked(
    "mascot_get_context_message",
    MascotMessagePayloadSchema,
    MascotMessageSchema,
    {
      profileId,
      routeName: payload.routeName,
      projectId: payload.projectId ?? null,
      locale: payload.locale ?? null,
    }
  );
}

/**
 * Retrieves get talks blueprint from domain/runtime dependencies.
 */
export async function getTalksBlueprint(
  profileId: string,
  projectId: string,
  locale?: string | null
): Promise<TalksBlueprint> {
  return invokeChecked(
    "talks_get_blueprint",
    TalksBlueprintPayloadSchema,
    TalksBlueprintSchema,
    {
      profileId,
      projectId,
      locale: locale ?? null,
    }
  );
}
