import { describe, expect, it } from "vitest";
import * as startPauseResume from "./audioRecorderCaptureStartPauseResume";
import * as startStop from "./audioRecorderCaptureStartStop";
import * as stop from "./audioRecorderCaptureStop";

describe("audioRecorderCaptureStartStop", () => {
  it("re-exports start/pause/resume from startPauseResume and stop from stop module", () => {
    expect(startStop.startRecording).toBe(startPauseResume.startRecording);
    expect(startStop.pauseRecording).toBe(startPauseResume.pauseRecording);
    expect(startStop.resumeRecording).toBe(startPauseResume.resumeRecording);
    expect(startStop.stopRecording).toBe(stop.stopRecording);
  });
});
