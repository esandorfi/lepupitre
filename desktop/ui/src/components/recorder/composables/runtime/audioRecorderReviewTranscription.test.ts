import { describe, expect, it } from "vitest";
import * as textCleanup from "./audioRecorderReviewTextCleanup";
import * as transcribeActions from "./audioRecorderReviewTranscribeActions";
import * as transcription from "./audioRecorderReviewTranscription";

describe("audioRecorderReviewTranscription", () => {
  it("re-exports transcribe and cleanup actions", () => {
    expect(transcription.transcribeRecording).toBe(transcribeActions.transcribeRecording);
    expect(transcription.saveEditedTranscript).toBe(transcribeActions.saveEditedTranscript);
    expect(transcription.autoCleanFillers).toBe(textCleanup.autoCleanFillers);
    expect(transcription.fixPunctuation).toBe(textCleanup.fixPunctuation);
  });
});
