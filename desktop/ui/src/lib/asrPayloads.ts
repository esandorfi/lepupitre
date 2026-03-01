import type { TranscriptionSettings } from "./transcriptionSettings";

type RecordingAsrSettingsPayload = {
  model: "tiny" | "base";
  mode: "auto" | "live+final" | "final-only";
  language: "auto" | "en" | "fr";
};

type TranscribeAsrSettingsPayload = {
  model: "tiny" | "base";
  language: "auto" | "en" | "fr";
  spokenPunctuation: boolean;
};

type RecordingStartPayload = {
  profileId: string;
  asrSettings: RecordingAsrSettingsPayload;
  inputDeviceId?: string;
};

type TranscribeAudioPayload = {
  profileId: string;
  audioArtifactId: string;
  asrSettings: TranscribeAsrSettingsPayload;
};

function toRecordingAsrSettingsPayload(
  settings: TranscriptionSettings
): RecordingAsrSettingsPayload {
  return {
    model: settings.model,
    mode: settings.mode,
    language: settings.language,
  };
}

function toTranscribeAsrSettingsPayload(
  settings: TranscriptionSettings
): TranscribeAsrSettingsPayload {
  return {
    model: settings.model,
    language: settings.language,
    spokenPunctuation: settings.spokenPunctuation,
  };
}

export function buildRecordingStartPayload(
  profileId: string,
  settings: TranscriptionSettings,
  inputDeviceId?: string | null
): RecordingStartPayload {
  const payload: RecordingStartPayload = {
    profileId,
    asrSettings: toRecordingAsrSettingsPayload(settings),
  };
  if (inputDeviceId) {
    payload.inputDeviceId = inputDeviceId;
  }
  return payload;
}

export function buildTranscribeAudioPayload(
  profileId: string,
  audioArtifactId: string,
  settings: TranscriptionSettings
): TranscribeAudioPayload {
  return {
    profileId,
    audioArtifactId,
    asrSettings: toTranscribeAsrSettingsPayload(settings),
  };
}
