import { invokeChecked } from "../../composables/useIpc";
import {
  AnalyzeAttemptPayloadSchema,
  AnalyzeResponseSchema,
  FeedbackContext,
  FeedbackContextPayloadSchema,
  FeedbackContextSchema,
  FeedbackGetPayloadSchema,
  FeedbackNoteGetPayloadSchema,
  FeedbackNoteResponseSchema,
  FeedbackNoteSetPayloadSchema,
  FeedbackTimelineItem,
  FeedbackTimelinePayloadSchema,
  FeedbackTimelineResponseSchema,
  FeedbackV1,
  FeedbackV1Schema,
  VoidResponseSchema,
} from "../../schemas/ipc";

export async function analyzeAttempt(profileId: string, attemptId: string) {
  return invokeChecked("analyze_attempt", AnalyzeAttemptPayloadSchema, AnalyzeResponseSchema, {
    profileId,
    attemptId,
  });
}

export async function getFeedback(profileId: string, feedbackId: string): Promise<FeedbackV1> {
  return invokeChecked("feedback_get", FeedbackGetPayloadSchema, FeedbackV1Schema, {
    profileId,
    feedbackId,
  });
}

export async function getFeedbackContext(
  profileId: string,
  feedbackId: string
): Promise<FeedbackContext> {
  return invokeChecked(
    "feedback_context_get",
    FeedbackContextPayloadSchema,
    FeedbackContextSchema,
    {
      profileId,
      feedbackId,
    }
  );
}

export async function getFeedbackTimeline(
  profileId: string,
  projectId?: string | null,
  limit?: number | null
): Promise<FeedbackTimelineItem[]> {
  return invokeChecked(
    "feedback_timeline_list",
    FeedbackTimelinePayloadSchema,
    FeedbackTimelineResponseSchema,
    {
      profileId,
      projectId: projectId ?? null,
      limit: limit ?? null,
    }
  );
}

export async function getFeedbackNote(
  profileId: string,
  feedbackId: string
): Promise<string | null> {
  return invokeChecked("feedback_note_get", FeedbackNoteGetPayloadSchema, FeedbackNoteResponseSchema, {
    profileId,
    feedbackId,
  });
}

export async function setFeedbackNote(profileId: string, feedbackId: string, note: string) {
  await invokeChecked("feedback_note_set", FeedbackNoteSetPayloadSchema, VoidResponseSchema, {
    profileId,
    feedbackId,
    note,
  });
}
