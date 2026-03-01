import { z } from "zod";

const OptionalString = z.string().min(1).optional().nullable();

export const EmptyPayloadSchema = z.object({});
export const IdSchema = z.string().min(1);
export const VoidResponseSchema = z.union([z.null(), z.undefined()]);
export const AsrSidecarStatusResponseSchema = z.union([z.null(), z.undefined()]);
const sensitivePreferenceKeyFragments = [
  "token",
  "secret",
  "password",
  "credential",
  "api_key",
  "apikey",
  "private_key",
] as const;

export const PreferenceKeySchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._:-]+$/)
  .refine((key) => {
    const normalized = key.toLowerCase().replace(/[.:-]/g, "_");
    return !sensitivePreferenceKeyFragments.some((fragment) =>
      normalized.includes(fragment)
    );
  }, "Sensitive preference keys are forbidden");
export const PreferenceValueResponseSchema = z.string().nullable();

export const PreferenceGlobalGetPayloadSchema = z.object({
  key: PreferenceKeySchema,
});

export const PreferenceGlobalSetPayloadSchema = z.object({
  key: PreferenceKeySchema,
  value: z.string().max(32768).nullable().optional(),
});

export const PreferenceProfileGetPayloadSchema = z.object({
  profileId: IdSchema,
  key: PreferenceKeySchema,
});

export const PreferenceProfileSetPayloadSchema = z.object({
  profileId: IdSchema,
  key: PreferenceKeySchema,
  value: z.string().max(32768).nullable().optional(),
});

export const ProfileCreatePayloadSchema = z.object({
  name: z.string().min(1).max(80),
});

export const ProfileSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  created_at: z.string().min(1),
  last_opened_at: z.string().min(1).nullable().optional(),
  is_active: z.boolean(),
  size_bytes: z.number().nonnegative(),
  talks_count: z.number().nonnegative(),
});

export const ProfileListResponseSchema = z.array(ProfileSummarySchema);

export const ProjectCreatePayloadSchema = z.object({
  title: z.string().min(1).max(120),
  audience: OptionalString,
  goal: OptionalString,
  duration_target_sec: z.number().int().positive().optional().nullable(),
});

export const ProjectCreateRequestSchema = z.object({
  profileId: IdSchema,
  payload: ProjectCreatePayloadSchema,
});

export const ProjectUpdatePayloadSchema = z.object({
  title: z.string().trim().min(1).max(120),
  audience: OptionalString,
  goal: OptionalString,
  duration_target_sec: z.number().int().positive().optional().nullable(),
  stage: z.string().min(1),
});

export const ProjectUpdateRequestSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
  payload: ProjectUpdatePayloadSchema,
});

export const ProjectSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  audience: OptionalString,
  goal: OptionalString,
  duration_target_sec: z.number().int().positive().nullable().optional(),
  talk_number: z.number().int().positive().nullable().optional(),
  stage: z.string().min(1),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const ProjectSummaryNullableSchema = ProjectSummarySchema.nullable();

export const ProjectListItemSchema = ProjectSummarySchema.extend({
  is_active: z.boolean(),
});

export const ProjectListResponseSchema = z.array(ProjectListItemSchema);

export const OutlineGetPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
});

export const OutlineSetPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
  markdown: z.string(),
});

export const OutlineDocSchema = z.object({
  project_id: IdSchema,
  markdown: z.string(),
  updated_at: z.string().min(1).optional().nullable(),
});

export const ExportOutlinePayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
});

export const ExportResultSchema = z.object({
  path: z.string().min(1),
});

export const PackExportPayloadSchema = z.object({
  profileId: IdSchema,
  runId: IdSchema,
});

export const PackInspectPayloadSchema = z.object({
  profileId: IdSchema,
  path: z.string().min(1),
});

export const PackFileSummarySchema = z.object({
  role: z.string().min(1),
  bytes: z.number(),
  mime: z.string().min(1),
});

export const PackInspectResponseSchema = z.object({
  fileName: z.string().min(1),
  fileBytes: z.number(),
  schemaVersion: z.string().min(1),
  packId: IdSchema,
  createdAt: z.string().min(1),
  appVersion: z.string().min(1),
  profileId: IdSchema.nullable(),
  projectId: IdSchema,
  runId: IdSchema,
  durationMs: z.number(),
  reviewerTag: z.string().min(1).nullable(),
  files: z.array(PackFileSummarySchema),
});

export const PeerReviewImportPayloadSchema = z.object({
  profileId: IdSchema,
  path: z.string().min(1),
});

export const PeerReviewImportResponseSchema = z.object({
  peerReviewId: IdSchema,
  projectId: IdSchema,
  runId: IdSchema,
});

export const PeerReviewListPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
  limit: z.number().int().positive().optional(),
});

export const PeerReviewSummarySchema = z.object({
  id: IdSchema,
  run_id: IdSchema,
  project_id: IdSchema,
  created_at: z.string().min(1),
  reviewer_tag: z.string().min(1).optional().nullable(),
});

export const PeerReviewV1Schema = z.object({
  schema_version: z.string().min(1),
  rubric_id: z.string().min(1),
  reviewer_tag: z.string().min(1).optional().nullable(),
  scores: z.record(z.string(), z.unknown()),
  free_text: z.record(z.string(), z.unknown()),
  timestamps: z.array(z.unknown()),
});

export const PeerReviewDetailSchema = z.object({
  id: IdSchema,
  run_id: IdSchema,
  project_id: IdSchema,
  created_at: z.string().min(1),
  reviewer_tag: z.string().min(1).optional().nullable(),
  review: PeerReviewV1Schema,
});

export const PeerReviewGetPayloadSchema = z.object({
  profileId: IdSchema,
  peerReviewId: IdSchema,
});

export const RunCreatePayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
});

export const RunFinishPayloadSchema = z.object({
  profileId: IdSchema,
  runId: IdSchema,
  audioArtifactId: IdSchema,
});

export const RunSetTranscriptPayloadSchema = z.object({
  profileId: IdSchema,
  runId: IdSchema,
  transcriptId: IdSchema,
});

export const RunAnalyzePayloadSchema = z.object({
  profileId: IdSchema,
  runId: IdSchema,
});

export const RunGetPayloadSchema = z.object({
  profileId: IdSchema,
  runId: IdSchema,
});

export const RunLatestPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
});

export const RunListPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
  limit: z.number().int().positive().optional(),
});

export const RunSummarySchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  created_at: z.string().min(1),
  audio_artifact_id: IdSchema.optional().nullable(),
  transcript_id: IdSchema.optional().nullable(),
  feedback_id: IdSchema.optional().nullable(),
});

export const RunSummaryNullableSchema = RunSummarySchema.nullable();
export const RunSummaryListSchema = z.array(RunSummarySchema);

export const QuestSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  estimated_sec: z.number().int().positive(),
  prompt: z.string().min(1),
  output_type: z.string().min(1),
  targets_issues: z.array(z.string().min(1)),
});

export const QuestDailySchema = z.object({
  quest: QuestSchema,
  why: z.string().min(1),
  due_boss_run: z.boolean(),
});

export const ProgressSnapshotPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema.optional().nullable(),
});

export const ProgressSnapshotSchema = z.object({
  project_id: IdSchema,
  attempts_total: z.number().int().nonnegative(),
  feedback_ready_total: z.number().int().nonnegative(),
  streak_days: z.number().int().nonnegative(),
  weekly_target: z.number().int().positive(),
  weekly_completed: z.number().int().nonnegative(),
  credits: z.number().int().nonnegative(),
  next_milestone: z.number().int().positive(),
  last_attempt_at: z.string().min(1).optional().nullable(),
});

export const MascotMessagePayloadSchema = z.object({
  profileId: IdSchema,
  routeName: z.string().min(1),
  projectId: IdSchema.optional().nullable(),
  locale: z.string().min(2).max(12).optional().nullable(),
});

export const MascotMessageSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  cta_label: z.string().min(1).optional().nullable(),
  cta_route: z.string().min(1).optional().nullable(),
});

export const TalksBlueprintPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
  locale: z.string().min(2).max(12).optional().nullable(),
});

export const TalksBlueprintStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  done: z.boolean(),
  reward_credits: z.number().int().nonnegative(),
  cta_route: z.string().min(1).optional().nullable(),
});

export const TalksBlueprintSchema = z.object({
  project_id: IdSchema,
  project_title: z.string().min(1),
  framework_id: z.string().min(1),
  framework_label: z.string().min(1),
  framework_summary: z.string().min(1),
  completion_percent: z.number().int().min(0).max(100),
  steps: z.array(TalksBlueprintStepSchema).min(1),
  next_step_id: z.string().min(1).optional().nullable(),
});

export const ProfileIdPayloadSchema = z.object({
  profileId: IdSchema,
});

export const ProfileRenamePayloadSchema = z.object({
  profileId: IdSchema,
  name: z.string().min(1).max(80),
});

export const ProjectIdPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
});

export const QuestGetDailyPayloadSchema = ProjectIdPayloadSchema;

export const QuestGetByCodePayloadSchema = z.object({
  profileId: IdSchema,
  questCode: z.string().min(1),
});

export const QuestListPayloadSchema = ProfileIdPayloadSchema;
export const QuestListResponseSchema = z.array(QuestSchema);

export const QuestSubmitTextPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
  questCode: z.string().min(1),
  text: z.string().min(1),
});

export const QuestSubmitAudioPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
  questCode: z.string().min(1),
  audioArtifactId: IdSchema,
  transcriptId: IdSchema.optional().nullable(),
});

export const QuestAttemptsListPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
  limit: z.number().int().positive().optional(),
});

export const QuestAttemptSummarySchema = z.object({
  id: IdSchema,
  quest_code: z.string().min(1),
  quest_title: z.string().min(1),
  output_type: z.string().min(1),
  created_at: z.string().min(1),
  has_audio: z.boolean(),
  has_transcript: z.boolean(),
  has_feedback: z.boolean(),
  feedback_id: IdSchema.optional().nullable(),
});

export const QuestAttemptListResponseSchema = z.array(QuestAttemptSummarySchema);

export const QuestReportPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
});

export const QuestReportItemSchema = z.object({
  quest_code: z.string().min(1),
  quest_title: z.string().min(1),
  quest_prompt: z.string().min(1),
  output_type: z.string().min(1),
  category: z.string().min(1),
  estimated_sec: z.number().int().positive(),
  attempt_id: IdSchema.optional().nullable(),
  attempt_created_at: z.string().min(1).optional().nullable(),
  has_audio: z.boolean(),
  has_transcript: z.boolean(),
  has_feedback: z.boolean(),
  feedback_id: IdSchema.optional().nullable(),
});

export const QuestReportResponseSchema = z.array(QuestReportItemSchema);

export const AudioSavePayloadSchema = z.object({
  profileId: IdSchema,
  base64: z.string().min(1),
});

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

export const AsrSettingsSchema = z.object({
  model: z.enum(["tiny", "base"]).optional(),
  mode: z.enum(["auto", "live+final", "final-only"]).optional(),
  language: z.enum(["auto", "en", "fr"]).optional(),
  spokenPunctuation: z.boolean().optional(),
});

export const RecordingStartPayloadSchema = z.object({
  profileId: IdSchema,
  asrSettings: AsrSettingsSchema.optional(),
  inputDeviceId: z.string().min(1).optional().nullable(),
});

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

export const TranscribeAudioPayloadSchema = z.object({
  profileId: IdSchema,
  audioArtifactId: IdSchema,
  asrSettings: AsrSettingsSchema.optional(),
});

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

export type AsrPartialEvent = z.infer<typeof AsrPartialEventSchema>;
export type AsrCommitEvent = z.infer<typeof AsrCommitEventSchema>;
export type AsrFinalProgressEvent = z.infer<typeof AsrFinalProgressEventSchema>;
export type AsrFinalResultEvent = z.infer<typeof AsrFinalResultEventSchema>;
export type RecordingTelemetryEvent = z.infer<typeof RecordingTelemetryEventSchema>;
export type RecordingInputDevice = z.infer<typeof RecordingInputDeviceSchema>;
export type RecordingTelemetryBudget = z.infer<typeof RecordingTelemetryBudgetResponseSchema>;

export type RecordingStartResponse = z.infer<typeof RecordingStartResponseSchema>;
export type RecordingStatusResponse = z.infer<typeof RecordingStatusResponseSchema>;
export type RecordingStopResponse = z.infer<typeof RecordingStopResponseSchema>;
export type TranscriptEditSaveResponse = z.infer<typeof TranscriptEditSaveResponseSchema>;

export type ProfileSummary = z.infer<typeof ProfileSummarySchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type ProjectListItem = z.infer<typeof ProjectListItemSchema>;
export type ProjectUpdatePayload = z.infer<typeof ProjectUpdatePayloadSchema>;
export type OutlineDoc = z.infer<typeof OutlineDocSchema>;
export type ExportResult = z.infer<typeof ExportResultSchema>;
export type PackInspectResponse = z.infer<typeof PackInspectResponseSchema>;
export type PeerReviewSummary = z.infer<typeof PeerReviewSummarySchema>;
export type PeerReviewDetail = z.infer<typeof PeerReviewDetailSchema>;
export type RunSummary = z.infer<typeof RunSummarySchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type QuestDaily = z.infer<typeof QuestDailySchema>;
export type ProgressSnapshot = z.infer<typeof ProgressSnapshotSchema>;
export type MascotMessage = z.infer<typeof MascotMessageSchema>;
export type TalksBlueprint = z.infer<typeof TalksBlueprintSchema>;
export type QuestAttemptSummary = z.infer<typeof QuestAttemptSummarySchema>;
export type QuestReportItem = z.infer<typeof QuestReportItemSchema>;
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;
export type TranscriptV1 = z.infer<typeof TranscriptV1Schema>;
export type TranscriptExportFormat = z.infer<typeof TranscriptExportFormatSchema>;
export type AsrModelStatus = z.infer<typeof AsrModelStatusSchema>;
export type AsrModelDownloadResult = z.infer<typeof AsrModelDownloadResultSchema>;
export type AsrModelDownloadProgressEvent = z.infer<typeof AsrModelDownloadProgressEventSchema>;
export type FeedbackV1 = z.infer<typeof FeedbackV1Schema>;
export type FeedbackContext = z.infer<typeof FeedbackContextSchema>;
export type FeedbackTimelineItem = z.infer<typeof FeedbackTimelineItemSchema>;
