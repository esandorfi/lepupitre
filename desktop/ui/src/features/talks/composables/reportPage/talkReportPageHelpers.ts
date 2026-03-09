import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "@/schemas/ipc";
import {
  talkBossRunRoute,
  talkPeerReviewRoute,
  talkQuestRoute,
} from "@/features/talks/composables/shared/talkRoutes";

type TranslateFn = (key: string) => string;

const DISPLAY_DATE_CACHE_LIMIT = 256;
const displayDateCache = new Map<string, string>();
const displayDateFormatter = new Intl.DateTimeFormat();

function rememberDisplayDate(key: string, value: string) {
  if (displayDateCache.size >= DISPLAY_DATE_CACHE_LIMIT) {
    const oldest = displayDateCache.keys().next().value;
    if (oldest) {
      displayDateCache.delete(oldest);
    }
  }
  displayDateCache.set(key, value);
  return value;
}

export type TimelineItem = {
  id: string;
  label: string;
  date: string;
  status: string;
  to?: string;
  meta?: string;
};

/**
 * Formats an ISO date for UI display with a small cache for repeated values.
 */
export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }
  const cached = displayDateCache.get(value);
  if (cached) {
    return cached;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return rememberDisplayDate(value, displayDateFormatter.format(date));
}

/**
 * Maps quest-attempt artifact presence to a translated status label.
 */
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

/**
 * Maps boss-run artifact presence to a translated timeline status label.
 */
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

/**
 * Normalizes output type labels with translation for known artifact types.
 */
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

/**
 * Builds a unified timeline of attempts, runs, and peer reviews sorted by newest first.
 */
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
      to: talkQuestRoute(projectId, attempt.quest_code),
      meta: questCodeLabel(attempt.quest_code),
    });
  }

  for (const run of runs) {
    items.push({
      id: run.id,
      label: t("talk_report.timeline_boss_run"),
      date: run.created_at,
      status: runStatus(t, run),
      to: talkBossRunRoute(run.id),
    });
  }

  for (const review of peerReviews) {
    items.push({
      id: review.id,
      label: t("talk_report.timeline_peer_review"),
      date: review.created_at,
      status: t("talk_report.timeline_peer_review_status"),
      to: talkPeerReviewRoute(projectId, review.id),
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

/**
 * Aggregates top-level report metrics used by talks summary cards.
 */
export function buildSummary(report: QuestReportItem[]) {
  const total = report.length;
  let started = 0;
  let feedbackCount = 0;
  let last: string | undefined;
  let lastTimestamp = -Infinity;

  for (const item of report) {
    if (item.attempt_id) {
      started += 1;
    }
    if (item.has_feedback) {
      feedbackCount += 1;
    }
    if (!item.attempt_created_at) {
      continue;
    }
    const timestamp = new Date(item.attempt_created_at).getTime();
    if (Number.isNaN(timestamp)) {
      continue;
    }
    if (timestamp > lastTimestamp) {
      lastTimestamp = timestamp;
      last = item.attempt_created_at;
    }
  }

  return { total, started, feedbackCount, last };
}
