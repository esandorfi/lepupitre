import { describe, expect, it } from "vitest";
import { appState } from "@/stores/app";
import { useAudioRecorderState } from "./useAudioRecorderState";

describe("useAudioRecorderState", () => {
  it("initializes recorder state refs with expected defaults", () => {
    const previousProfileId = appState.activeProfileId;
    appState.activeProfileId = "profile-1";

    const state = useAudioRecorderState();

    expect(state.activeProfileId.value).toBe("profile-1");
    expect(state.phase.value).toBe("capture");
    expect(state.statusKey.value).toBe("audio.status_idle");
    expect(state.isRecording.value).toBe(false);
    expect(state.isPaused.value).toBe(false);
    expect(state.error.value).toBeNull();
    expect(state.transcript.value).toBeNull();
    expect(state.transcribeProgress.value).toBe(0);
    expect(state.liveWaveformPeaks.value).toEqual([]);
    expect(state.inputDevices.value).toEqual([]);
    expect(state.telemetryBudget.value).toBeNull();

    appState.activeProfileId = previousProfileId;
  });
});
