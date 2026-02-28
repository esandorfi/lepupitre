const STORAGE_PREFIX = "lepupitre.feedback.reviewed";

function storageKey(profileId: string) {
  return `${STORAGE_PREFIX}.${profileId}`;
}

export function readReviewedFeedbackIds(profileId: string): Set<string> {
  if (!profileId) {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(storageKey(profileId));
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(
      parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    );
  } catch {
    return new Set();
  }
}

export function markFeedbackReviewed(profileId: string, feedbackId: string) {
  if (!profileId || !feedbackId) {
    return;
  }
  const reviewed = readReviewedFeedbackIds(profileId);
  reviewed.add(feedbackId);
  try {
    window.localStorage.setItem(storageKey(profileId), JSON.stringify(Array.from(reviewed)));
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
