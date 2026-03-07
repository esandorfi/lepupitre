import { describe, expect, it } from "vitest";
import * as exportActions from "./audioRecorderReviewExportActions";
import * as navigationActions from "./audioRecorderReviewNavigationActions";
import * as reviewActions from "./audioRecorderReviewActions";

describe("audioRecorderReviewActions", () => {
  it("re-exports review navigation and export actions", () => {
    expect(reviewActions.goAnalyzeExport).toBe(navigationActions.goAnalyzeExport);
    expect(reviewActions.backToQuickClean).toBe(navigationActions.backToQuickClean);
    expect(reviewActions.requestAnalyze).toBe(navigationActions.requestAnalyze);
    expect(reviewActions.handleCapturePrimaryAction).toBe(navigationActions.handleCapturePrimaryAction);
    expect(reviewActions.handleShortcut).toBe(navigationActions.handleShortcut);
    expect(reviewActions.exportTranscript).toBe(exportActions.exportTranscript);
    expect(reviewActions.exportPreset).toBe(exportActions.exportPreset);
    expect(reviewActions.openExportPath).toBe(exportActions.openExportPath);
    expect(reviewActions.revealRecording).toBe(exportActions.revealRecording);
  });
});
