import { describe, expect, it, vi } from "vitest";
import {
  cleanupAudioRecorderListeners,
  createAudioRecorderCleanupSet,
} from "./audioRecorderRuntimeListenerTypes";

describe("audioRecorderRuntimeListenerTypes", () => {
  it("creates cleanup set with null listener handles", () => {
    const cleanups = createAudioRecorderCleanupSet();

    expect(cleanups).toEqual({
      unlistenProgress: null,
      unlistenCompleted: null,
      unlistenFailed: null,
      unlistenAsrPartial: null,
      unlistenAsrCommit: null,
      unlistenAsrFinalProgress: null,
      unlistenAsrFinalResult: null,
      unlistenRecordingTelemetry: null,
    });
  });

  it("invokes all registered cleanup callbacks", () => {
    const cleanups = createAudioRecorderCleanupSet();
    cleanups.unlistenProgress = vi.fn();
    cleanups.unlistenCompleted = vi.fn();
    cleanups.unlistenFailed = vi.fn();
    cleanups.unlistenRecordingTelemetry = vi.fn();
    cleanups.unlistenAsrPartial = vi.fn();
    cleanups.unlistenAsrCommit = vi.fn();
    cleanups.unlistenAsrFinalProgress = vi.fn();
    cleanups.unlistenAsrFinalResult = vi.fn();

    cleanupAudioRecorderListeners(cleanups);

    expect(cleanups.unlistenProgress).toHaveBeenCalled();
    expect(cleanups.unlistenCompleted).toHaveBeenCalled();
    expect(cleanups.unlistenFailed).toHaveBeenCalled();
    expect(cleanups.unlistenRecordingTelemetry).toHaveBeenCalled();
    expect(cleanups.unlistenAsrPartial).toHaveBeenCalled();
    expect(cleanups.unlistenAsrCommit).toHaveBeenCalled();
    expect(cleanups.unlistenAsrFinalProgress).toHaveBeenCalled();
    expect(cleanups.unlistenAsrFinalResult).toHaveBeenCalled();
  });
});
