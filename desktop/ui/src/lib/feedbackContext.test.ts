import { describe, expect, it } from "vitest";
import { resolveFeedbackBackLink, resolveFeedbackContextLabel } from "./feedbackContext";

describe("feedbackContext", () => {
  it("keeps run feedback back-link with run id", () => {
    expect(
      resolveFeedbackBackLink(
        {
          subject_type: "run",
          subject_id: "run-ctx",
          project_id: "p1",
          quest_code: null,
          quest_title: null,
          run_id: "run-1",
        },
        "p1"
      )
    ).toBe("/boss-run?runId=run-1");
  });

  it("keeps quest feedback back-link and project context", () => {
    expect(
      resolveFeedbackBackLink(
        {
          subject_type: "attempt",
          subject_id: "attempt-1",
          project_id: "p7",
          quest_code: "Q-15",
          quest_title: "quest",
          run_id: null,
        },
        null
      )
    ).toBe("/quest/Q-15?from=talk&projectId=p7");
  });

  it("falls back to active talk when feedback context is incomplete", () => {
    expect(resolveFeedbackBackLink(null, "p9")).toBe("/talks/p9");
    expect(resolveFeedbackBackLink(null, null)).toBe("/");
  });

  it("formats quest context label and run label deterministically", () => {
    expect(
      resolveFeedbackContextLabel(
        {
          subject_type: "attempt",
          subject_id: "attempt-1",
          project_id: "p7",
          quest_code: "Q-15",
          quest_title: "quest",
          run_id: null,
        },
        (projectId, questCode) => `${projectId}:${questCode}`,
        "Boss run"
      )
    ).toBe("p7:Q-15");
    expect(
      resolveFeedbackContextLabel(
        {
          subject_type: "run",
          subject_id: "run-1",
          project_id: "p7",
          quest_code: null,
          quest_title: null,
          run_id: "run-1",
        },
        () => "",
        "Boss run"
      )
    ).toBe("Boss run");
  });
});
