import { describe, expect, it } from "vitest";
import {
  AsrFinalProgressEventSchema,
  FeedbackContextSchema,
  TranscriptV1Schema,
  TranscribeAudioPayloadSchema,
} from "./ipc";

describe("ipc schemas", () => {
  it("accepts transcribe payload with camelCase UI fields", () => {
    const parsed = TranscribeAudioPayloadSchema.safeParse({
      profileId: "p-1",
      audioArtifactId: "a-1",
      asrSettings: {
        model: "tiny",
        mode: "auto",
        language: "en",
        spokenPunctuation: true,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects transcribe payload with snake_case fields", () => {
    const parsed = TranscribeAudioPayloadSchema.safeParse({
      profile_id: "p-1",
      audio_artifact_id: "a-1",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts transcript payload with snake_case backend fields", () => {
    const parsed = TranscriptV1Schema.safeParse({
      schema_version: "1.0.0",
      language: "en",
      model_id: "tiny",
      duration_ms: 1000,
      segments: [
        {
          t_start_ms: 0,
          t_end_ms: 1000,
          text: "hello",
          confidence: 0.9,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts final progress events in camelCase event format", () => {
    const parsed = AsrFinalProgressEventSchema.safeParse({
      schemaVersion: "1.0.0",
      processedMs: 500,
      totalMs: 1000,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts feedback context in backend snake_case format", () => {
    const parsed = FeedbackContextSchema.safeParse({
      subject_type: "attempt",
      subject_id: "attempt-1",
      project_id: "p-1",
      quest_code: "Q-1",
      quest_title: "Quest title",
      run_id: null,
    });
    expect(parsed.success).toBe(true);
  });
});
