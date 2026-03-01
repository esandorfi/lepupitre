import type { TranscriptionSettings } from "./transcriptionSettings";

type AsrSettingsPayload = {
  model: "tiny" | "base";
  mode: "auto" | "live+final" | "final-only";
  language: "auto" | "en" | "fr";
  spokenPunctuation: boolean;
};

type RecordingStartPayload = {
  profileId: string;
  asrSettings: AsrSettingsPayload;
};

type TranscribeAudioPayload = {
  profileId: string;
  audioArtifactId: string;
  asrSettings: AsrSettingsPayload;
};

function toAsrSettingsPayload(settings: TranscriptionSettings): AsrSettingsPayload {
  return {
    model: settings.model,
    mode: settings.mode,
    language: settings.language,
    spokenPunctuation: settings.spokenPunctuation,
  };
}

export function buildRecordingStartPayload(
  profileId: string,
  settings: TranscriptionSettings
): RecordingStartPayload {
  return {
    profileId,
    asrSettings: toAsrSettingsPayload(settings),
  };
}

export function buildTranscribeAudioPayload(
  profileId: string,
  audioArtifactId: string,
  settings: TranscriptionSettings
): TranscribeAudioPayload {
  return {
    profileId,
    audioArtifactId,
    asrSettings: toAsrSettingsPayload(settings),
  };
}
