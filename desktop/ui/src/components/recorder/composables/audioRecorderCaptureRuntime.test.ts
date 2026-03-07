import { describe, expect, it } from "vitest";
import * as captureReadiness from "@/components/recorder/composables/runtime/audioRecorderCaptureReadiness";
import * as captureTransport from "@/components/recorder/composables/runtime/audioRecorderCaptureTransport";
import * as captureUtils from "@/components/recorder/composables/runtime/audioRecorderCaptureUtils";
import * as captureRuntime from "./audioRecorderCaptureRuntime";

describe("audioRecorderCaptureRuntime", () => {
  it("re-exports capture utils, readiness and transport actions", () => {
    expect(captureRuntime.mapStageToLabel).toBe(captureUtils.mapStageToLabel);
    expect(captureRuntime.resetLiveTranscript).toBe(captureUtils.resetLiveTranscript);
    expect(captureRuntime.resolveRecorderHealthErrorCode).toBe(
      captureUtils.resolveRecorderHealthErrorCode
    );

    expect(captureRuntime.refreshStatus).toBe(captureReadiness.refreshStatus);
    expect(captureRuntime.refreshInputDevices).toBe(captureReadiness.refreshInputDevices);
    expect(captureRuntime.refreshTranscribeReadiness).toBe(
      captureReadiness.refreshTranscribeReadiness
    );

    expect(captureRuntime.startRecording).toBe(captureTransport.startRecording);
    expect(captureRuntime.pauseRecording).toBe(captureTransport.pauseRecording);
    expect(captureRuntime.resumeRecording).toBe(captureTransport.resumeRecording);
    expect(captureRuntime.stopRecording).toBe(captureTransport.stopRecording);
    expect(captureRuntime.applyTrim).toBe(captureTransport.applyTrim);
  });
});
