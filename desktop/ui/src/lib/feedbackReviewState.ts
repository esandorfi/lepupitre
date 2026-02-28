const STORAGE_PREFIX = "lepupitre.feedback.reviewed";
const MAX_REVIEWED_IDS = 400;

function storageKey(profileId: string) {
  return `${STORAGE_PREFIX}.${profileId}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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
  if (!profileId || !canUseStorage()) {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(storageKey(profileId));
    if (!raw) {
      return new Set();
    }
    return new Set(sanitizeReviewedIds(JSON.parse(raw)));
  } catch {
    return new Set();
  }
}

export function markFeedbackReviewed(profileId: string, feedbackId: string) {
  if (!profileId || !feedbackId || !canUseStorage()) {
    return;
  }
  const normalizedFeedbackId = feedbackId.trim();
  if (!normalizedFeedbackId) {
    return;
  }
  const reviewed = readReviewedFeedbackIds(profileId);
  reviewed.add(normalizedFeedbackId);
  try {
    const next = sanitizeReviewedIds(Array.from(reviewed));
    window.localStorage.setItem(storageKey(profileId), JSON.stringify(next));
  } catch {
    // ignore storage write errors
  }
}

export function isFeedbackReviewed(profileId: string, feedbackId: string): boolean {
  if (!profileId || !feedbackId) {
    return false;
  }
  return readReviewedFeedbackIds(profileId).has(feedbackId);
}
