import { describe, expect, it } from "vitest";
import {
  RecordingStartPayloadSchema,
  TranscribeAudioPayloadSchema,
} from "../schemas/ipc";
import {
  buildRecordingStartPayload,
  buildTranscribeAudioPayload,
} from "./asrPayloads";

const SETTINGS = {
  model: "base" as const,
  mode: "final-only" as const,
  language: "fr" as const,
  spokenPunctuation: true,
};

describe("asrPayloads", () => {
  it("builds recording_start payload with asr settings intact", () => {
    const payload = buildRecordingStartPayload("profile-1", SETTINGS);
    const parsed = RecordingStartPayloadSchema.parse(payload);
    expect(parsed.profileId).toBe("profile-1");
    expect(parsed.asrSettings).toEqual(SETTINGS);
  });

  it("includes selected input device id when provided", () => {
    const payload = buildRecordingStartPayload("profile-1", SETTINGS, "mic-1-USB");
    const parsed = RecordingStartPayloadSchema.parse(payload);
    expect(parsed.inputDeviceId).toBe("mic-1-USB");
  });

  it("builds transcribe_audio payload with asr settings intact", () => {
    const payload = buildTranscribeAudioPayload("profile-1", "audio-1", SETTINGS);
    const parsed = TranscribeAudioPayloadSchema.parse(payload);
    expect(parsed.profileId).toBe("profile-1");
    expect(parsed.audioArtifactId).toBe("audio-1");
    expect(parsed.asrSettings).toEqual(SETTINGS);
  });
});
