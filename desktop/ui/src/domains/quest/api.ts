import { invokeChecked } from "@/composables/useIpc";
import {
  IdSchema,
  Quest,
  QuestAttemptListResponseSchema,
  QuestAttemptSummary,
  QuestAttemptsListPayloadSchema,
  QuestDaily,
  QuestDailySchema,
  QuestGetByCodePayloadSchema,
  QuestGetDailyPayloadSchema,
  QuestListPayloadSchema,
  QuestListResponseSchema,
  QuestSchema,
  QuestReportItem,
  QuestReportPayloadSchema,
  QuestReportResponseSchema,
  QuestSubmitAudioPayloadSchema,
  QuestSubmitTextPayloadSchema,
} from "@/schemas/ipc";

/**
 * Retrieves get daily quest from domain/runtime dependencies.
 */
export async function getDailyQuest(
  profileId: string,
  projectId: string
): Promise<QuestDaily> {
  return invokeChecked("quest_get_daily", QuestGetDailyPayloadSchema, QuestDailySchema, {
    profileId,
    projectId,
  });
}

/**
 * Retrieves get quest attempts from domain/runtime dependencies.
 */
export async function getQuestAttempts(
  profileId: string,
  projectId: string,
  limit: number
): Promise<QuestAttemptSummary[]> {
  return invokeChecked(
    "quest_attempts_list",
    QuestAttemptsListPayloadSchema,
    QuestAttemptListResponseSchema,
    {
      profileId,
      projectId,
      limit,
    }
  );
}

/**
 * Implements submit quest text behavior.
 */
export async function submitQuestText(
  profileId: string,
  projectId: string,
  questCode: string,
  text: string
) {
  return invokeChecked("quest_submit_text", QuestSubmitTextPayloadSchema, IdSchema, {
    profileId,
    projectId,
    questCode,
    text,
  });
}

/**
 * Implements submit quest audio behavior.
 */
export async function submitQuestAudio(
  profileId: string,
  projectId: string,
  payload: {
    questCode: string;
    audioArtifactId: string;
    transcriptId?: string | null;
  }
) {
  return invokeChecked("quest_submit_audio", QuestSubmitAudioPayloadSchema, IdSchema, {
    profileId,
    projectId,
    questCode: payload.questCode,
    audioArtifactId: payload.audioArtifactId,
    transcriptId: payload.transcriptId ?? null,
  });
}

/**
 * Retrieves get quest by code from domain/runtime dependencies.
 */
export async function getQuestByCode(profileId: string, questCode: string): Promise<Quest> {
  return invokeChecked("quest_get_by_code", QuestGetByCodePayloadSchema, QuestSchema, {
    profileId,
    questCode,
  });
}

/**
 * Retrieves get quest list from domain/runtime dependencies.
 */
export async function getQuestList(profileId: string): Promise<Quest[]> {
  return invokeChecked("quest_list", QuestListPayloadSchema, QuestListResponseSchema, {
    profileId,
  });
}

/**
 * Retrieves get quest report from domain/runtime dependencies.
 */
export async function getQuestReport(
  profileId: string,
  projectId: string
): Promise<QuestReportItem[]> {
  return invokeChecked("quest_report", QuestReportPayloadSchema, QuestReportResponseSchema, {
    profileId,
    projectId,
  });
}
