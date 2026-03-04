import {
  readAchievementMemory,
  writeAchievementMemory,
  type AchievementMemory,
} from "@/lib/trainingPreferences";
import type { ProgressSnapshot } from "@/schemas/ipc";

export type AchievementPulse = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaRoute: string;
};

type Translate = (key: string) => string;

export function evaluateAchievementPulse(
  profileId: string,
  progress: ProgressSnapshot,
  t: Translate
): AchievementPulse | null {
  const currentTier = Math.max(0, Math.floor(progress.credits / 50));
  const currentStreak = Math.max(0, progress.streak_days);
  const previous = readAchievementMemory(profileId);
  if (!previous) {
    writeAchievementMemory(profileId, {
      creditTier: currentTier,
      maxStreak: currentStreak,
    });
    return null;
  }

  const nextMemory: AchievementMemory = {
    creditTier: Math.max(previous.creditTier, currentTier),
    maxStreak: Math.max(previous.maxStreak, currentStreak),
  };

  let pulse: AchievementPulse | null = null;
  if (previous.maxStreak < 7 && currentStreak >= 7) {
    pulse = {
      id: "streak-7",
      title: t("training.achievement_streak7_title"),
      body: t("training.achievement_streak7_body"),
      ctaLabel: t("training.achievement_cta_boss_run"),
      ctaRoute: "/boss-run",
    };
  } else if (previous.maxStreak < 3 && currentStreak >= 3) {
    pulse = {
      id: "streak-3",
      title: t("training.achievement_streak3_title"),
      body: t("training.achievement_streak3_body"),
      ctaLabel: t("training.achievement_cta_training"),
      ctaRoute: "/training",
    };
  } else if (currentTier > previous.creditTier) {
    pulse = {
      id: "credits-tier",
      title: t("training.achievement_levelup_title"),
      body: t("training.achievement_levelup_body"),
      ctaLabel: t("training.achievement_cta_feedback"),
      ctaRoute: "/feedback",
    };
  }

  writeAchievementMemory(profileId, nextMemory);
  return pulse;
}
