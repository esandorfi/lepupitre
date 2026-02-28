import { readPreference, writePreference } from "./preferencesStorage";

const STORAGE_PREFIX = "lepupitre.feedback.reviewed";
const MAX_REVIEWED_IDS = 400;

function storageKey(profileId: string) {
  return `${STORAGE_PREFIX}.${profileId}`;
}

function sanitizeReviewedIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const deduped = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const normalized = item.trim();
    if (!normalized) {
      continue;
    }
    deduped.add(normalized);
  }
  const all = Array.from(deduped);
  if (all.length <= MAX_REVIEWED_IDS) {
    return all;
  }
  return all.slice(all.length - MAX_REVIEWED_IDS);
}

export function readReviewedFeedbackIds(profileId: string): Set<string> {
  if (!profileId) {
    return new Set();
  }
  try {
    const raw = readPreference(storageKey(profileId));
    if (!raw) {
      return new Set();
    }
    return new Set(sanitizeReviewedIds(JSON.parse(raw)));
  } catch {
    return new Set();
  }
}

export function markFeedbackReviewed(profileId: string, feedbackId: string) {
  if (!profileId || !feedbackId) {
    return;
  }
  const normalizedFeedbackId = feedbackId.trim();
  if (!normalizedFeedbackId) {
    return;
  }
  const reviewed = readReviewedFeedbackIds(profileId);
  reviewed.add(normalizedFeedbackId);
  const next = sanitizeReviewedIds(Array.from(reviewed));
  writePreference(storageKey(profileId), JSON.stringify(next));
}

export function isFeedbackReviewed(profileId: string, feedbackId: string): boolean {
  if (!profileId || !feedbackId) {
    return false;
  }
  return readReviewedFeedbackIds(profileId).has(feedbackId);
}
