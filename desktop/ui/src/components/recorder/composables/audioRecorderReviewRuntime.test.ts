import { describe, expect, it } from "vitest";
import * as reviewActions from "@/components/recorder/composables/runtime/audioRecorderReviewActions";
import * as reviewTranscription from "@/components/recorder/composables/runtime/audioRecorderReviewTranscription";
import * as reviewRuntime from "./audioRecorderReviewRuntime";

describe("audioRecorderReviewRuntime", () => {
  it("re-exports transcription, cleanup, navigation and export handlers", () => {
    expect(reviewRuntime.transcribeRecording).toBe(reviewTranscription.transcribeRecording);
    expect(reviewRuntime.saveEditedTranscript).toBe(reviewTranscription.saveEditedTranscript);
    expect(reviewRuntime.autoCleanFillers).toBe(reviewTranscription.autoCleanFillers);
    expect(reviewRuntime.fixPunctuation).toBe(reviewTranscription.fixPunctuation);

    expect(reviewRuntime.goAnalyzeExport).toBe(reviewActions.goAnalyzeExport);
    expect(reviewRuntime.backToQuickClean).toBe(reviewActions.backToQuickClean);
    expect(reviewRuntime.handleShortcut).toBe(reviewActions.handleShortcut);
    expect(reviewRuntime.exportTranscript).toBe(reviewActions.exportTranscript);
    expect(reviewRuntime.exportPreset).toBe(reviewActions.exportPreset);
    expect(reviewRuntime.openExportPath).toBe(reviewActions.openExportPath);
    expect(reviewRuntime.revealRecording).toBe(reviewActions.revealRecording);
  });
});
