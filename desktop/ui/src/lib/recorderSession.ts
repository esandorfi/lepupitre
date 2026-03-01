export type RecorderTransportState = "idle" | "recording" | "paused";

export type RecorderTransportAction = "start" | "pause" | "resume" | "stop";

export type RecorderTransportFlags = {
  isRecording: boolean;
  isPaused: boolean;
};

export type RecorderMediaActions = {
  canPlayback: boolean;
  canTrim: boolean;
};

export function applyRecorderTransportAction(
  state: RecorderTransportFlags,
  action: RecorderTransportAction
): RecorderTransportFlags {
  if (action === "start") {
    return { isRecording: true, isPaused: false };
  }
  if (action === "pause") {
    if (!state.isRecording) {
      return state;
    }
    return { isRecording: false, isPaused: true };
  }
  if (action === "resume") {
    if (!state.isPaused) {
      return state;
    }
    return { isRecording: true, isPaused: false };
  }
  return { isRecording: false, isPaused: false };
}

export function deriveRecorderTransportState(
  state: RecorderTransportFlags
): RecorderTransportState {
  if (state.isRecording) {
    return "recording";
  }
  if (state.isPaused) {
    return "paused";
  }
  return "idle";
}

export function resolveRecorderMediaActions(input: {
  hasAudioArtifact: boolean;
  isApplyingTrim: boolean;
}): RecorderMediaActions {
  return {
    canPlayback: input.hasAudioArtifact,
    canTrim: input.hasAudioArtifact && !input.isApplyingTrim,
  };
}
