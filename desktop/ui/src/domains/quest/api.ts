import { invokeChecked } from "../../composables/useIpc";
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
} from "../../schemas/ipc";

export async function getDailyQuest(
  profileId: string,
  projectId: string
): Promise<QuestDaily> {
  return invokeChecked("quest_get_daily", QuestGetDailyPayloadSchema, QuestDailySchema, {
    profileId,
    projectId,
  });
}

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

export async function getQuestByCode(profileId: string, questCode: string): Promise<Quest> {
  return invokeChecked("quest_get_by_code", QuestGetByCodePayloadSchema, QuestSchema, {
    profileId,
    questCode,
  });
}

export async function getQuestList(profileId: string): Promise<Quest[]> {
  return invokeChecked("quest_list", QuestListPayloadSchema, QuestListResponseSchema, {
    profileId,
  });
}

export async function getQuestReport(
  profileId: string,
  projectId: string
): Promise<QuestReportItem[]> {
  return invokeChecked("quest_report", QuestReportPayloadSchema, QuestReportResponseSchema, {
    profileId,
    projectId,
  });
}
