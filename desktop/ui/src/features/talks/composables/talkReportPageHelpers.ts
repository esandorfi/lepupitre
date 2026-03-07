import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "@/schemas/ipc";

type TranslateFn = (key: string) => string;

export type TimelineItem = {
  id: string;
  label: string;
  date: string;
  status: string;
  to?: string;
  meta?: string;
};

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

export function attemptStatus(
  t: TranslateFn,
  item: { has_feedback: boolean; has_transcript: boolean; has_audio: boolean }
) {
  if (item.has_feedback) {
    return t("quest.status_feedback");
  }
  if (item.has_transcript) {
    return t("quest.status_transcribed");
  }
  if (item.has_audio) {
    return t("quest.status_recorded");
  }
  return t("quest.status_not_started");
}

export function runStatus(t: TranslateFn, run: RunSummary) {
  if (run.feedback_id) {
    return t("talk_report.timeline_feedback");
  }
  if (run.transcript_id) {
    return t("talk_report.timeline_transcribed");
  }
  if (run.audio_artifact_id) {
    return t("talk_report.timeline_recorded");
  }
  return t("talk_report.timeline_started");
}

export function outputLabel(t: TranslateFn, outputType: string) {
  const type = outputType.toLowerCase();
  if (type === "audio") {
    return t("quest.output_audio");
  }
  if (type === "text") {
    return t("quest.output_text");
  }
  return outputType;
}

export function buildTimeline(
  t: TranslateFn,
  projectId: string,
  attempts: QuestAttemptSummary[],
  runs: RunSummary[],
  peerReviews: PeerReviewSummary[],
  questCodeLabel: (code: string) => string
) {
  const items: TimelineItem[] = [];

  for (const attempt of attempts) {
    items.push({
      id: attempt.id,
      label: attempt.quest_title,
      date: attempt.created_at,
      status: attemptStatus(t, attempt),
      to: `/quest/${attempt.quest_code}?from=talk&projectId=${projectId}`,
      meta: questCodeLabel(attempt.quest_code),
    });
  }

  for (const run of runs) {
    items.push({
      id: run.id,
      label: t("talk_report.timeline_boss_run"),
      date: run.created_at,
      status: runStatus(t, run),
      to: `/boss-run?runId=${run.id}`,
    });
  }

  for (const review of peerReviews) {
    items.push({
      id: review.id,
      label: t("talk_report.timeline_peer_review"),
      date: review.created_at,
      status: t("talk_report.timeline_peer_review_status"),
      to: `/peer-review/${review.id}?projectId=${projectId}`,
      meta: review.reviewer_tag ?? undefined,
    });
  }

  items.sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return 0;
    }
    return bTime - aTime;
  });

  return items;
}

export function buildSummary(report: QuestReportItem[]) {
  const total = report.length;
  const started = report.filter((item) => item.attempt_id).length;
  const feedbackCount = report.filter((item) => item.has_feedback).length;
  const last = report
    .map((item) => item.attempt_created_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .pop();
  return { total, started, feedbackCount, last };
}
