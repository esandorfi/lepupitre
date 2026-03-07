import { describe, expect, it } from "vitest";
import { buildCleanTextAnchors, buildCleanTextLineAnchors, compactPreview } from "./quickClean.timelineAnchors";

const chunks = [
  { startMs: 0, endMs: 10_000, text: "Hello team and welcome" },
  { startMs: 10_000, endMs: 20_000, text: "We cover Vue patterns in this segment" },
  { startMs: 20_000, endMs: 30_000, text: "Closing notes and action items" },
];

describe("quickClean.timelineAnchors", () => {
  it("compacts previews when text is longer than max", () => {
    expect(compactPreview("short", 10)).toBe("short");
    expect(compactPreview("0123456789abcdef", 10)).toBe("0123456789...");
  });

  it("builds clean text anchors by matching line/chunk token overlap", () => {
    const anchors = buildCleanTextAnchors({
      transcriptText: "hello welcome\nvue patterns",
      hasTranscript: true,
      chunks,
    });

    expect(anchors).toEqual([
      { line: "hello welcome", startMs: 0, endMs: 10_000 },
      { line: "vue patterns", startMs: 10_000, endMs: 20_000 },
    ]);
  });

  it("builds per-line anchors and preserves blank-line null entries", () => {
    const lineAnchors = buildCleanTextLineAnchors({
      transcriptText: "hello welcome\n\nclosing notes",
      hasTranscript: true,
      chunks,
    });

    expect(lineAnchors).toEqual([
      { line: "hello welcome", startMs: 0, endMs: 10_000 },
      null,
      { line: "closing notes", startMs: 20_000, endMs: 30_000 },
    ]);
  });

  it("returns empty anchors when transcript context is unavailable", () => {
    expect(
      buildCleanTextAnchors({
        transcriptText: "",
        hasTranscript: false,
        chunks,
      })
    ).toEqual([]);

    expect(
      buildCleanTextLineAnchors({
        transcriptText: "line",
        hasTranscript: true,
        chunks: [],
      })
    ).toEqual([]);
  });
});
