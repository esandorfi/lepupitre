export type AudioRecorderCleanupSet = {
  unlistenProgress: (() => void) | null;
  unlistenCompleted: (() => void) | null;
  unlistenFailed: (() => void) | null;
  unlistenAsrPartial: (() => void) | null;
  unlistenAsrCommit: (() => void) | null;
  unlistenAsrFinalProgress: (() => void) | null;
  unlistenAsrFinalResult: (() => void) | null;
  unlistenRecordingTelemetry: (() => void) | null;
};

export function createAudioRecorderCleanupSet(): AudioRecorderCleanupSet {
  return {
    unlistenProgress: null,
    unlistenCompleted: null,
    unlistenFailed: null,
    unlistenAsrPartial: null,
    unlistenAsrCommit: null,
    unlistenAsrFinalProgress: null,
    unlistenAsrFinalResult: null,
    unlistenRecordingTelemetry: null,
  };
}

export function cleanupAudioRecorderListeners(cleanups: AudioRecorderCleanupSet) {
  cleanups.unlistenProgress?.();
  cleanups.unlistenCompleted?.();
  cleanups.unlistenFailed?.();
  cleanups.unlistenRecordingTelemetry?.();
  cleanups.unlistenAsrPartial?.();
  cleanups.unlistenAsrCommit?.();
  cleanups.unlistenAsrFinalProgress?.();
  cleanups.unlistenAsrFinalResult?.();
}
