import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "@/schemas/ipc";
import {
  loadTalkArtifactsBase,
  loadTalkArtifactsWithAttempts,
  loadTalkPageData,
} from "./talkRuntimeDataLoader";

describe("talkRuntimeDataLoader", () => {
  it("loads base artifacts in parallel and returns them", async () => {
    const deps = {
      getQuestReport: vi.fn(async () => [{ quest_code: "Q1" } as QuestReportItem]),
      getRuns: vi.fn(async () => [{ id: "run-1" } as RunSummary]),
      getPeerReviews: vi.fn(async () => [{ id: "peer-1" } as PeerReviewSummary]),
    };

    const result = await loadTalkArtifactsBase(deps, "project-1", 8);

    expect(deps.getQuestReport).toHaveBeenCalledWith("project-1");
    expect(deps.getRuns).toHaveBeenCalledWith("project-1", 8);
    expect(deps.getPeerReviews).toHaveBeenCalledWith("project-1", 8);
    expect(result).toEqual({
      report: [{ quest_code: "Q1" }],
      runs: [{ id: "run-1" }],
      peerReviews: [{ id: "peer-1" }],
    });
  });

  it("loads artifacts with attempts", async () => {
    const deps = {
      getQuestReport: vi.fn(async () => [{ quest_code: "Q1" } as QuestReportItem]),
      getRuns: vi.fn(async () => [{ id: "run-1" } as RunSummary]),
      getPeerReviews: vi.fn(async () => [{ id: "peer-1" } as PeerReviewSummary]),
      getQuestAttempts: vi.fn(async () => [{ id: "attempt-1" } as QuestAttemptSummary]),
    };

    const result = await loadTalkArtifactsWithAttempts(deps, "project-1");

    expect(deps.getQuestAttempts).toHaveBeenCalledWith("project-1", 12);
    expect(result.attempts).toEqual([{ id: "attempt-1" }]);
    expect(result.report).toEqual([{ quest_code: "Q1" }]);
  });

  it("returns null and marks validation error when project id is missing", async () => {
    const onProjectMissing = vi.fn();
    const result = await loadTalkPageData({
      bootstrapSession: async () => {},
      loadProjects: async () => {},
      projectId: "",
      isStale: () => false,
      onProjectMissing,
      ui: { error: ref<string | null>(null) },
      loadArtifacts: async () => ({ ok: true }),
    });

    expect(result).toBeNull();
    expect(onProjectMissing).toHaveBeenCalledTimes(1);
  });

  it("stops loading when request became stale", async () => {
    const loadArtifacts = vi.fn(async () => ({ ok: true }));
    const result = await loadTalkPageData({
      bootstrapSession: async () => {},
      loadProjects: async () => {},
      projectId: "project-1",
      isStale: () => true,
      onProjectMissing: () => {},
      ui: { error: ref<string | null>(null) },
      loadArtifacts,
    });

    expect(result).toBeNull();
    expect(loadArtifacts).not.toHaveBeenCalled();
  });
});
