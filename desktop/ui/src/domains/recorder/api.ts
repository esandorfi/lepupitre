import { invokeChecked } from "@/composables/useIpc";
import {
  AudioRevealWavPayloadSchema,
  AudioTrimPayloadSchema,
  AudioTrimResponseSchema,
  EmptyPayloadSchema,
  RecordingInputDevicesResponseSchema,
  RecordingPausePayloadSchema,
  RecordingResumePayloadSchema,
  RecordingStartPayloadSchema,
  RecordingStartResponseSchema,
  RecordingStatusPayloadSchema,
  RecordingStatusResponseSchema,
  RecordingStopPayloadSchema,
  RecordingStopResponseSchema,
  RecordingTelemetryBudgetResponseSchema,
  VoidResponseSchema,
} from "@/schemas/ipc";

/**
 * Records recording start telemetry/state events.
 */
export async function recordingStart(payload: {
  profileId: string;
  asrSettings?: {
    model?: "tiny" | "base";
    mode?: "auto" | "live+final" | "final-only";
    language?: "auto" | "en" | "fr";
  };
  inputDeviceId?: string | null;
}) {
  return invokeChecked(
    "recording_start",
    RecordingStartPayloadSchema,
    RecordingStartResponseSchema,
    payload
  );
}

/**
 * Records recording status telemetry/state events.
 */
export async function recordingStatus(recordingId: string) {
  return invokeChecked(
    "recording_status",
    RecordingStatusPayloadSchema,
    RecordingStatusResponseSchema,
    { recordingId }
  );
}

/**
 * Records recording pause telemetry/state events.
 */
export async function recordingPause(recordingId: string) {
  await invokeChecked("recording_pause", RecordingPausePayloadSchema, VoidResponseSchema, {
    recordingId,
  });
}

/**
 * Records recording resume telemetry/state events.
 */
export async function recordingResume(recordingId: string) {
  await invokeChecked("recording_resume", RecordingResumePayloadSchema, VoidResponseSchema, {
    recordingId,
  });
}

/**
 * Records recording stop telemetry/state events.
 */
export async function recordingStop(profileId: string, recordingId: string) {
  return invokeChecked(
    "recording_stop",
    RecordingStopPayloadSchema,
    RecordingStopResponseSchema,
    { profileId, recordingId }
  );
}

/**
 * Lists list recording input devices from domain/runtime dependencies.
 */
export async function listRecordingInputDevices() {
  return invokeChecked(
    "recording_input_devices",
    EmptyPayloadSchema,
    RecordingInputDevicesResponseSchema,
    {}
  );
}

/**
 * Records recording telemetry budget telemetry/state events.
 */
export async function recordingTelemetryBudget() {
  return invokeChecked(
    "recording_telemetry_budget",
    EmptyPayloadSchema,
    RecordingTelemetryBudgetResponseSchema,
    {}
  );
}

/**
 * Implements audio trim wav behavior.
 */
export async function audioTrimWav(payload: {
  profileId: string;
  audioArtifactId: string;
  startMs: number;
  endMs: number;
}) {
  return invokeChecked("audio_trim_wav", AudioTrimPayloadSchema, AudioTrimResponseSchema, payload);
}

/**
 * Implements audio reveal wav behavior.
 */
export async function audioRevealWav(path: string) {
  await invokeChecked("audio_reveal_wav", AudioRevealWavPayloadSchema, VoidResponseSchema, {
    path,
  });
}
