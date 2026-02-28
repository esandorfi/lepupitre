export type AchievementMemory = {
  creditTier: number;
  maxStreak: number;
};

const HERO_QUEST_PREFIX = "lepupitre.training.heroQuest";
const ACHIEVEMENT_PREFIX = "lepupitre.training.achievements";
const MAX_QUEST_CODE_LENGTH = 64;

function hasStorage() {
  return typeof localStorage !== "undefined";
}

function heroQuestStorageKey(profileId: string) {
  return `${HERO_QUEST_PREFIX}.${profileId}`;
}

function achievementStorageKey(profileId: string) {
  return `${ACHIEVEMENT_PREFIX}.${profileId}`;
}

export function readStoredHeroQuestCode(profileId: string): string | null {
  if (!profileId || !hasStorage()) {
    return null;
  }
  try {
    const value = localStorage.getItem(heroQuestStorageKey(profileId));
    if (!value) {
      return null;
    }
    const normalized = value.trim();
    if (!normalized || normalized.length > MAX_QUEST_CODE_LENGTH) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

export function writeStoredHeroQuestCode(profileId: string, questCode: string | null) {
  if (!profileId || !hasStorage()) {
    return;
  }
  try {
    const key = heroQuestStorageKey(profileId);
    const normalized = questCode?.trim() ?? "";
    if (!normalized) {
      localStorage.removeItem(key);
      return;
    }
    if (normalized.length > MAX_QUEST_CODE_LENGTH) {
      return;
    }
    localStorage.setItem(key, normalized);
  } catch {
    // local-only preference; ignore storage failures
  }
}

export function readAchievementMemory(profileId: string): AchievementMemory | null {
  if (!profileId || !hasStorage()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(achievementStorageKey(profileId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<AchievementMemory>;
    if (
      typeof parsed.creditTier !== "number" ||
      !Number.isFinite(parsed.creditTier) ||
      typeof parsed.maxStreak !== "number" ||
      !Number.isFinite(parsed.maxStreak)
    ) {
      return null;
    }
    return {
      creditTier: Math.max(0, Math.floor(parsed.creditTier)),
      maxStreak: Math.max(0, Math.floor(parsed.maxStreak)),
    };
  } catch {
    return null;
  }
}

export function writeAchievementMemory(profileId: string, memory: AchievementMemory) {
  if (!profileId || !hasStorage()) {
    return;
  }
  try {
    localStorage.setItem(achievementStorageKey(profileId), JSON.stringify(memory));
  } catch {
    // non-blocking local preference
  }
}
