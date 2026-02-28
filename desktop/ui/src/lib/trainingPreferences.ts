import { readPreference, removePreference, writePreference } from "./preferencesStorage";

export type AchievementMemory = {
  creditTier: number;
  maxStreak: number;
};

const HERO_QUEST_PREFIX = "lepupitre.training.heroQuest";
const ACHIEVEMENT_PREFIX = "lepupitre.training.achievements";
const MAX_QUEST_CODE_LENGTH = 64;

function heroQuestStorageKey(profileId: string) {
  return `${HERO_QUEST_PREFIX}.${profileId}`;
}

function achievementStorageKey(profileId: string) {
  return `${ACHIEVEMENT_PREFIX}.${profileId}`;
}

export function readStoredHeroQuestCode(profileId: string): string | null {
  if (!profileId) {
    return null;
  }
  try {
    const value = readPreference(heroQuestStorageKey(profileId), {
      scope: "profile",
      profileId,
    });
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
  if (!profileId) {
    return;
  }
  const key = heroQuestStorageKey(profileId);
  const normalized = questCode?.trim() ?? "";
  if (!normalized) {
    removePreference(key, { scope: "profile", profileId });
    return;
  }
  if (normalized.length > MAX_QUEST_CODE_LENGTH) {
    return;
  }
  writePreference(key, normalized, { scope: "profile", profileId });
}

export function readAchievementMemory(profileId: string): AchievementMemory | null {
  if (!profileId) {
    return null;
  }
  try {
    const raw = readPreference(achievementStorageKey(profileId), {
      scope: "profile",
      profileId,
    });
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
  if (!profileId) {
    return;
  }
  writePreference(achievementStorageKey(profileId), JSON.stringify(memory), {
    scope: "profile",
    profileId,
  });
}
