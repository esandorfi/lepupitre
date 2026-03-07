import { describe, expect, it } from "vitest";
import * as startStop from "./audioRecorderCaptureStartStop";
import * as trim from "./audioRecorderCaptureTrim";
import * as transport from "./audioRecorderCaptureTransport";

describe("audioRecorderCaptureTransport", () => {
  it("re-exports capture transport and trim actions", () => {
    expect(transport.startRecording).toBe(startStop.startRecording);
    expect(transport.pauseRecording).toBe(startStop.pauseRecording);
    expect(transport.resumeRecording).toBe(startStop.resumeRecording);
    expect(transport.stopRecording).toBe(startStop.stopRecording);
    expect(transport.applyTrim).toBe(trim.applyTrim);
  });
});
