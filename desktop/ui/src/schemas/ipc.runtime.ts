import { z } from "zod";
import { IdSchema } from "./ipc.core";

export const AudioSaveResponseSchema = z.object({
  path: z.string().min(1),
  artifactId: z.string().min(1),
  bytes: z.number().nonnegative(),
  sha256: z.string().min(1),
});

export const AudioTrimPayloadSchema = z
  .object({
    profileId: IdSchema,
    audioArtifactId: IdSchema,
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
  })
  .refine((value) => value.endMs > value.startMs, {
    message: "endMs must be greater than startMs",
    path: ["endMs"],
  });

export const AudioTrimResponseSchema = AudioSaveResponseSchema.extend({
  durationMs: z.number().int().nonnegative(),
});

export const AudioRevealWavPayloadSchema = z.object({
  path: z.string().min(1),
});

export const SecurityProbeFsPayloadSchema = z.object({
  path: z.string().min(1),
});

export const SecurityProbeFsResponseSchema = z.string().min(1);
export const SecurityPrepareAppdataFileResponseSchema = z.string().min(1);

export const RecordingAsrSettingsSchema = z
  .object({
    model: z.enum(["tiny", "base"]).optional(),
    mode: z.enum(["auto", "live+final", "final-only"]).optional(),
    language: z.enum(["auto", "en", "fr"]).optional(),
  })
  .strict();

export const TranscribeAsrSettingsSchema = z
  .object({
    model: z.enum(["tiny", "base"]).optional(),
    language: z.enum(["auto", "en", "fr"]).optional(),
    spokenPunctuation: z.boolean().optional(),
  })
  .strict();

export const AsrSettingsSchema = z
  .object({
  model: z.enum(["tiny", "base"]).optional(),
  mode: z.enum(["auto", "live+final", "final-only"]).optional(),
  language: z.enum(["auto", "en", "fr"]).optional(),
  spokenPunctuation: z.boolean().optional(),
  })
  .strict();

export const RecordingStartPayloadSchema = z
  .object({
    profileId: IdSchema,
    asrSettings: RecordingAsrSettingsSchema.optional(),
    inputDeviceId: z.string().min(1).optional().nullable(),
  })
  .strict();

export const RecordingStartResponseSchema = z.object({
  recordingId: IdSchema,
  inputSampleRate: z.number().int().positive(),
  inputChannels: z.number().int().positive(),
});

export const RecordingInputDeviceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  isDefault: z.boolean(),
});

export const RecordingInputDevicesResponseSchema = z.array(RecordingInputDeviceSchema);

export const RecordingTelemetryBudgetResponseSchema = z.object({
  eventIntervalMs: z.number().int().positive(),
  maxEventRateHz: z.number().positive(),
  maxPayloadBytes: z.number().int().positive(),
  waveformBins: z.number().int().positive(),
  estimatedPayloadBytes: z.number().int().positive(),
});

export const RecordingStatusPayloadSchema = z.object({
  recordingId: IdSchema,
});

export const RecordingStatusResponseSchema = z.object({
  durationMs: z.number().int().nonnegative(),
  level: z.number().min(0).max(1),
  isPaused: z.boolean().optional(),
  signalPresent: z.boolean().optional(),
  isClipping: z.boolean().optional(),
  qualityHintKey: z.string().min(1).optional(),
});

export const RecordingPausePayloadSchema = z.object({
  recordingId: IdSchema,
});

export const RecordingResumePayloadSchema = z.object({
  recordingId: IdSchema,
});

export const RecordingStopPayloadSchema = z.object({
  profileId: IdSchema,
  recordingId: IdSchema,
});

export const RecordingStopResponseSchema = AudioSaveResponseSchema.extend({
  durationMs: z.number().int().nonnegative(),
});

export const TranscribeAudioPayloadSchema = z
  .object({
    profileId: IdSchema,
    audioArtifactId: IdSchema,
    asrSettings: TranscribeAsrSettingsSchema.optional(),
  })
  .strict();

export const TranscribeResponseSchema = z.object({
  transcriptId: IdSchema,
  jobId: IdSchema.optional(),
});

export const TranscriptSegmentSchema = z.object({
  t_start_ms: z.number().int().nonnegative(),
  t_end_ms: z.number().int().nonnegative(),
  text: z.string().min(1),
  confidence: z.number().min(0).max(1).optional().nullable(),
});

export const TranscriptV1Schema = z.object({
  schema_version: z.literal("1.0.0"),
  language: z.string().min(2),
  model_id: z.string().min(1).optional().nullable(),
  duration_ms: z.number().int().nonnegative().optional().nullable(),
  segments: z.array(TranscriptSegmentSchema).min(1),
});

export const AsrPartialEventSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  text: z.string(),
  t0Ms: z.number().int().nonnegative(),
  t1Ms: z.number().int().nonnegative(),
  seq: z.number().int().nonnegative(),
});

export const AsrCommitEventSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  segments: z.array(TranscriptSegmentSchema).min(1),
  seq: z.number().int().nonnegative(),
});

export const AsrFinalProgressEventSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  processedMs: z.number().int().nonnegative(),
  totalMs: z.number().int().nonnegative(),
});

export const AsrFinalResultEventSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  text: z.string().min(1),
  segments: z.array(TranscriptSegmentSchema).min(1),
});

export const RecordingTelemetryEventSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  durationMs: z.number().int().nonnegative(),
  level: z.number().min(0).max(1),
  isClipping: z.boolean(),
  signalPresent: z.boolean(),
  qualityHintKey: z.string().min(1),
  waveformPeaks: z.array(z.number().min(0).max(1)).min(1),
});

export const TranscriptGetPayloadSchema = z.object({
  profileId: IdSchema,
  transcriptId: IdSchema,
});

export const TranscriptEditSavePayloadSchema = z.object({
  profileId: IdSchema,
  transcriptId: IdSchema,
  editedText: z.string().min(1),
});

export const TranscriptEditSaveResponseSchema = z.object({
  transcriptId: IdSchema,
});

export const TranscriptExportFormatSchema = z.enum(["txt", "json", "srt", "vtt"]);

export const TranscriptExportPayloadSchema = z.object({
  profileId: IdSchema,
  transcriptId: IdSchema,
  format: TranscriptExportFormatSchema,
});

export const AsrModelStatusSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  bundled: z.boolean(),
  installed: z.boolean(),
  expected_bytes: z.number().nonnegative(),
  expected_sha256: z.string().min(1),
  source_url: z.string().min(1),
  path: z.string().min(1).optional().nullable(),
  size_bytes: z.number().nonnegative().optional().nullable(),
  checksum_ok: z.boolean().optional().nullable(),
});

export const AsrModelsListSchema = z.array(AsrModelStatusSchema);

export const AsrModelDownloadPayloadSchema = z.object({
  modelId: z.string().min(1),
});

export const AsrModelRemovePayloadSchema = z.object({
  modelId: z.string().min(1),
});

export const AsrModelVerifyPayloadSchema = z.object({
  modelId: z.string().min(1),
});

export const AsrModelVerifyResultSchema = AsrModelStatusSchema;

export const AsrModelDownloadResultSchema = z.object({
  modelId: z.string().min(1),
  path: z.string().min(1),
  bytes: z.number().nonnegative(),
  sha256: z.string().min(1),
});

export const AsrModelDownloadProgressEventSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  modelId: z.string().min(1),
  downloadedBytes: z.number().nonnegative(),
  totalBytes: z.number().nonnegative(),
});

export const VoiceMemoDeletePayloadSchema = z.object({
  path: z.string().min(1),
});

export const AnalyzeAttemptPayloadSchema = z.object({
  profileId: IdSchema,
  attemptId: IdSchema,
});

export const AnalyzeResponseSchema = z.object({
  feedbackId: IdSchema,
});

export const FeedbackGetPayloadSchema = z.object({
  profileId: IdSchema,
  feedbackId: IdSchema,
});

export const FeedbackContextPayloadSchema = FeedbackGetPayloadSchema;

export const FeedbackContextSchema = z.object({
  subject_type: z.string().min(1),
  subject_id: IdSchema,
  project_id: IdSchema,
  quest_code: z.string().min(1).optional().nullable(),
  quest_title: z.string().min(1).optional().nullable(),
  run_id: IdSchema.optional().nullable(),
});

export const FeedbackTimelinePayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema.optional().nullable(),
  limit: z.number().int().positive().optional().nullable(),
});

export const FeedbackTimelineItemSchema = z.object({
  id: IdSchema,
  created_at: z.string().min(1),
  overall_score: z.number().int().min(0).max(100),
  subject_type: z.enum(["quest_attempt", "run"]),
  project_id: IdSchema,
  quest_code: z.string().min(1).optional().nullable(),
  quest_title: z.string().min(1).optional().nullable(),
  run_id: IdSchema.optional().nullable(),
  note_updated_at: z.string().min(1).optional().nullable(),
});

export const FeedbackTimelineResponseSchema = z.array(FeedbackTimelineItemSchema);

export const FeedbackNoteGetPayloadSchema = FeedbackGetPayloadSchema;

export const FeedbackNoteSetPayloadSchema = z.object({
  profileId: IdSchema,
  feedbackId: IdSchema,
  note: z.string().nullable().optional(),
});

export const FeedbackNoteResponseSchema = z.string().nullable();

export const FeedbackActionSchema = z.object({
  action_id: z.string().min(1),
  title: z.string().min(1),
  why_it_matters: z.string().min(1),
  how_to_fix: z.string().min(1),
  target_quest_codes: z.array(z.string().min(1)).min(1).max(3),
});

export const FeedbackCommentSchema = z.object({
  t_start_ms: z.number().int().nonnegative(),
  t_end_ms: z.number().int().nonnegative(),
  severity: z.enum(["low", "medium", "high"]),
  label: z.string().min(1),
  evidence: z.record(z.string(), z.unknown()).optional().nullable(),
  suggestion: z.string().min(1),
});

export const FeedbackMetricsSchema = z.object({
  wpm: z.number().nonnegative(),
  filler_per_min: z.number().nonnegative(),
  pause_count: z.number().int().nonnegative(),
  avg_sentence_words: z.number().nonnegative(),
  repeat_terms: z.array(z.string().min(1)).max(10),
  jargon_terms: z.array(z.string().min(1)).optional().nullable(),
  density_score: z.number().nonnegative().optional().nullable(),
});

export const FeedbackV1Schema = z.object({
  schema_version: z.literal("1.0.0"),
  overall_score: z.number().int().min(0).max(100),
  top_actions: z.array(FeedbackActionSchema).max(2),
  comments: z.array(FeedbackCommentSchema).max(7),
  metrics: FeedbackMetricsSchema,
});


