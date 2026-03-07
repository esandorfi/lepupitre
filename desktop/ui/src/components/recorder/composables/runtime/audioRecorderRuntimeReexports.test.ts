import { describe, expect, it } from "vitest";
import * as captureStartPauseResume from "./audioRecorderCaptureStartPauseResume";
import * as captureStartStop from "./audioRecorderCaptureStartStop";
import * as captureStop from "./audioRecorderCaptureStop";
import * as captureTransport from "./audioRecorderCaptureTransport";
import * as captureTrim from "./audioRecorderCaptureTrim";
import * as listenerRegistrations from "./audioRecorderRuntimeListenerRegistrations";
import * as listenerTypes from "./audioRecorderRuntimeListenerTypes";
import * as runtimeListeners from "./audioRecorderRuntimeListeners";
import * as reviewActions from "./audioRecorderReviewActions";
import * as reviewExportActions from "./audioRecorderReviewExportActions";
import * as reviewNavigationActions from "./audioRecorderReviewNavigationActions";
import * as reviewTextCleanup from "./audioRecorderReviewTextCleanup";
import * as reviewTranscribeActions from "./audioRecorderReviewTranscribeActions";
import * as reviewTranscription from "./audioRecorderReviewTranscription";

describe("audioRecorderRuntimeReexports", () => {
  it("re-exports capture start/stop transport actions", () => {
    expect(captureStartStop.startRecording).toBe(captureStartPauseResume.startRecording);
    expect(captureStartStop.pauseRecording).toBe(captureStartPauseResume.pauseRecording);
    expect(captureStartStop.resumeRecording).toBe(captureStartPauseResume.resumeRecording);
    expect(captureStartStop.stopRecording).toBe(captureStop.stopRecording);

    expect(captureTransport.startRecording).toBe(captureStartStop.startRecording);
    expect(captureTransport.pauseRecording).toBe(captureStartStop.pauseRecording);
    expect(captureTransport.resumeRecording).toBe(captureStartStop.resumeRecording);
    expect(captureTransport.stopRecording).toBe(captureStartStop.stopRecording);
    expect(captureTransport.applyTrim).toBe(captureTrim.applyTrim);
  });

  it("re-exports review transcription/navigation/export actions", () => {
    expect(reviewTranscription.transcribeRecording).toBe(reviewTranscribeActions.transcribeRecording);
    expect(reviewTranscription.saveEditedTranscript).toBe(reviewTranscribeActions.saveEditedTranscript);
    expect(reviewTranscription.autoCleanFillers).toBe(reviewTextCleanup.autoCleanFillers);
    expect(reviewTranscription.fixPunctuation).toBe(reviewTextCleanup.fixPunctuation);

    expect(reviewActions.goAnalyzeExport).toBe(reviewNavigationActions.goAnalyzeExport);
    expect(reviewActions.backToQuickClean).toBe(reviewNavigationActions.backToQuickClean);
    expect(reviewActions.handleShortcut).toBe(reviewNavigationActions.handleShortcut);
    expect(reviewActions.exportTranscript).toBe(reviewExportActions.exportTranscript);
    expect(reviewActions.exportPreset).toBe(reviewExportActions.exportPreset);
  });

  it("re-exports listener factory and runtime registration", () => {
    expect(runtimeListeners.createAudioRecorderCleanupSet).toBe(
      listenerTypes.createAudioRecorderCleanupSet
    );
    expect(runtimeListeners.cleanupAudioRecorderListeners).toBe(
      listenerTypes.cleanupAudioRecorderListeners
    );
    expect(runtimeListeners.registerAudioRecorderRuntimeListeners).toBe(
      listenerRegistrations.registerAudioRecorderRuntimeListeners
    );
  });
});
