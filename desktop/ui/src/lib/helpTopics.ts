export const CANONICAL_ROUTE_TOPIC_MAP = {
  training: "help.training.daily-loop",
  quest: "help.training.quest-run",
  feedback: "help.training.feedback-priorities",
  "boss-run": "help.training.boss-run",
  "talk-builder": "help.talks.builder-outline",
  builder: "help.talks.builder-outline",
  packs: "help.packs.import-export",
  settings: "help.settings.transcription",
} as const;

export const CANONICAL_HELP_TOPIC_IDS = [
  "help.training.daily-loop",
  "help.training.quest-run",
  "help.training.feedback-priorities",
  "help.training.boss-run",
  "help.talks.builder-outline",
  "help.packs.import-export",
  "help.settings.transcription",
] as const;

export type CanonicalHelpTopicId = (typeof CANONICAL_HELP_TOPIC_IDS)[number];

export function resolveHelpTopicForRoute(routeName: string | null): CanonicalHelpTopicId | null {
  if (!routeName) {
    return null;
  }
  return CANONICAL_ROUTE_TOPIC_MAP[routeName as keyof typeof CANONICAL_ROUTE_TOPIC_MAP] ?? null;
}
