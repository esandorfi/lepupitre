import { ref, onUnmounted } from "vue";
import { listen } from "@tauri-apps/api/event";
import { RecordingTelemetryEventSchema } from "@/schemas/ipc";
import { appState } from "@/stores/appState";
import {
  voiceMemoStart,
  voiceMemoPause,
  voiceMemoResume,
  voiceMemoStop,
} from "@/domains/voice-recorder/api";

export type VoiceRecorderStatus = "idle" | "recording" | "paused";

export function useVoiceRecorder() {
  const status = ref<VoiceRecorderStatus>("idle");
  const recordingId = ref<string | null>(null);
  const durationMs = ref(0);
  const level = ref(0);
  const waveformPeaks = ref<number[]>([]);
  const qualityHintKey = ref("good_level");
  const error = ref<string | null>(null);

  let unlistenTelemetry: (() => void) | null = null;

  async function setupTelemetryListener() {
    unlistenTelemetry = await listen("recording/telemetry/v1", (event) => {
      if (!recordingId.value) return;
      const parsed = RecordingTelemetryEventSchema.safeParse(event.payload);
      if (!parsed.success) return;
      durationMs.value = parsed.data.durationMs;
      level.value = parsed.data.level;
      waveformPeaks.value = parsed.data.waveformPeaks;
      qualityHintKey.value = parsed.data.qualityHintKey;
    });
  }

  function teardownTelemetryListener() {
    if (unlistenTelemetry) {
      unlistenTelemetry();
      unlistenTelemetry = null;
    }
  }

  async function start(inputDeviceId?: string | null) {
    const profileId = appState.activeProfileId;
    if (!profileId) {
      error.value = "no_profile";
      return;
    }
    error.value = null;
    try {
      await setupTelemetryListener();
      const result = await voiceMemoStart(profileId, inputDeviceId);
      recordingId.value = result.recordingId;
      status.value = "recording";
      durationMs.value = 0;
      level.value = 0;
      waveformPeaks.value = [];
      qualityHintKey.value = "good_level";
    } catch (err) {
      teardownTelemetryListener();
      error.value = err instanceof Error ? err.message : String(err);
    }
  }

  async function pause() {
    if (!recordingId.value) return;
    try {
      await voiceMemoPause(recordingId.value);
      status.value = "paused";
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    }
  }

  async function resume() {
    if (!recordingId.value) return;
    try {
      await voiceMemoResume(recordingId.value);
      status.value = "recording";
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    }
  }

  async function stop() {
    const profileId = appState.activeProfileId;
    if (!profileId || !recordingId.value) return null;
    try {
      const result = await voiceMemoStop(profileId, recordingId.value);
      recordingId.value = null;
      status.value = "idle";
      teardownTelemetryListener();
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      recordingId.value = null;
      status.value = "idle";
      teardownTelemetryListener();
      return null;
    }
  }

  onUnmounted(() => {
    teardownTelemetryListener();
  });

  return {
    status,
    recordingId,
    durationMs,
    level,
    waveformPeaks,
    qualityHintKey,
    error,
    start,
    pause,
    resume,
    stop,
  };
}
