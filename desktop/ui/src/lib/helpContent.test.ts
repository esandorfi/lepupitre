import { describe, expect, it } from "vitest";
import {
  getHelpContentById,
  getOnboardingTrackByAudience,
  listHelpContentEntries,
  parseHelpAudience,
  parseHelpTopic,
  toHelpTopicElementId,
} from "./helpContent";

describe("helpContent", () => {
  it("loads all help markdown entries with unique ids", () => {
    const entries = listHelpContentEntries();
    expect(entries.length).toBeGreaterThanOrEqual(10);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  });

  it("resolves onboarding tracks per audience", () => {
    expect(getOnboardingTrackByAudience("first")?.id).toBe("onboarding.first-time-speaker");
    expect(getOnboardingTrackByAudience("manager")?.id).toBe("onboarding.engineering-manager");
    expect(getOnboardingTrackByAudience("conference")?.id).toBe("onboarding.conference-speaker");
  });

  it("parses query params for audience and topic deterministically", () => {
    expect(parseHelpAudience("first")).toBe("first");
    expect(parseHelpAudience(["manager"])).toBe("manager");
    expect(parseHelpAudience("invalid")).toBe(null);

    expect(parseHelpTopic("help.training.daily-loop")).toBe("help.training.daily-loop");
    expect(parseHelpTopic(["help.training.boss-run"])).toBe("help.training.boss-run");
    expect(parseHelpTopic("")).toBe(null);
  });

  it("creates stable DOM ids for topic anchors", () => {
    expect(toHelpTopicElementId("help.training.daily-loop")).toBe(
      "help-topic-help-training-daily-loop"
    );
  });

  it("renders known content entries as html", () => {
    const entry = getHelpContentById("help.training.daily-loop");
    expect(entry).not.toBeNull();
    expect(entry?.html).toContain("<h2>");
    expect(entry?.html).toContain("3-step workflow");
  });
});
