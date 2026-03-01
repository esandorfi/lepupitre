import { describe, expect, it } from "vitest";
import {
  applyRecorderTransportAction,
  deriveRecorderTransportState,
  resolveRecorderMediaActions,
} from "./recorderSession";

describe("recorderSession", () => {
  it("enforces start -> pause -> resume -> stop transport transitions", () => {
    const started = applyRecorderTransportAction(
      { isRecording: false, isPaused: false },
      "start"
    );
    expect(deriveRecorderTransportState(started)).toBe("recording");

    const paused = applyRecorderTransportAction(started, "pause");
    expect(deriveRecorderTransportState(paused)).toBe("paused");

    const resumed = applyRecorderTransportAction(paused, "resume");
    expect(deriveRecorderTransportState(resumed)).toBe("recording");

    const stopped = applyRecorderTransportAction(resumed, "stop");
    expect(deriveRecorderTransportState(stopped)).toBe("idle");
  });

  it("keeps invalid pause/resume actions as no-op", () => {
    const idle = { isRecording: false, isPaused: false };
    expect(applyRecorderTransportAction(idle, "pause")).toEqual(idle);
    expect(applyRecorderTransportAction(idle, "resume")).toEqual(idle);
  });

  it("exposes trim/playback availability from artifact state", () => {
    expect(
      resolveRecorderMediaActions({
        hasAudioArtifact: false,
        isApplyingTrim: false,
      })
    ).toEqual({
      canPlayback: false,
      canTrim: false,
    });

    expect(
      resolveRecorderMediaActions({
        hasAudioArtifact: true,
        isApplyingTrim: false,
      })
    ).toEqual({
      canPlayback: true,
      canTrim: true,
    });

    expect(
      resolveRecorderMediaActions({
        hasAudioArtifact: true,
        isApplyingTrim: true,
      })
    ).toEqual({
      canPlayback: true,
      canTrim: false,
    });
  });
});
