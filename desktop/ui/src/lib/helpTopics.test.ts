import { describe, expect, it } from "vitest";
import { getHelpContentById } from "./helpContent";
import { CANONICAL_HELP_TOPIC_IDS, resolveHelpTopicForRoute } from "./helpTopics";

describe("helpTopics", () => {
  it("maps canonical routes to stable topic ids", () => {
    expect(resolveHelpTopicForRoute("training")).toBe("help.training.daily-loop");
    expect(resolveHelpTopicForRoute("quest")).toBe("help.training.quest-run");
    expect(resolveHelpTopicForRoute("feedback")).toBe("help.training.feedback-priorities");
    expect(resolveHelpTopicForRoute("boss-run")).toBe("help.training.boss-run");
    expect(resolveHelpTopicForRoute("talk-builder")).toBe("help.talks.builder-outline");
    expect(resolveHelpTopicForRoute("builder")).toBe("help.talks.builder-outline");
    expect(resolveHelpTopicForRoute("packs")).toBe("help.packs.import-export");
    expect(resolveHelpTopicForRoute("settings")).toBe("help.settings.transcription");
    expect(resolveHelpTopicForRoute("help")).toBe(null);
  });

  it("ensures every mapped topic id resolves to existing markdown content", () => {
    for (const topicId of CANONICAL_HELP_TOPIC_IDS) {
      expect(getHelpContentById(topicId)?.id).toBe(topicId);
    }
  });
});
