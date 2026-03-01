import { invokeChecked } from "../../composables/useIpc";
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
} from "../../schemas/ipc";

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

export async function recordingStatus(recordingId: string) {
  return invokeChecked(
    "recording_status",
    RecordingStatusPayloadSchema,
    RecordingStatusResponseSchema,
    { recordingId }
  );
}

export async function recordingPause(recordingId: string) {
  await invokeChecked("recording_pause", RecordingPausePayloadSchema, VoidResponseSchema, {
    recordingId,
  });
}

export async function recordingResume(recordingId: string) {
  await invokeChecked("recording_resume", RecordingResumePayloadSchema, VoidResponseSchema, {
    recordingId,
  });
}

export async function recordingStop(profileId: string, recordingId: string) {
  return invokeChecked(
    "recording_stop",
    RecordingStopPayloadSchema,
    RecordingStopResponseSchema,
    { profileId, recordingId }
  );
}

export async function listRecordingInputDevices() {
  return invokeChecked(
    "recording_input_devices",
    EmptyPayloadSchema,
    RecordingInputDevicesResponseSchema,
    {}
  );
}

export async function recordingTelemetryBudget() {
  return invokeChecked(
    "recording_telemetry_budget",
    EmptyPayloadSchema,
    RecordingTelemetryBudgetResponseSchema,
    {}
  );
}

export async function audioTrimWav(payload: {
  profileId: string;
  audioArtifactId: string;
  startMs: number;
  endMs: number;
}) {
  return invokeChecked("audio_trim_wav", AudioTrimPayloadSchema, AudioTrimResponseSchema, payload);
}

export async function audioRevealWav(path: string) {
  await invokeChecked("audio_reveal_wav", AudioRevealWavPayloadSchema, VoidResponseSchema, {
    path,
  });
}
