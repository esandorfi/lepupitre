import { z } from "zod";

const OptionalString = z.string().min(1).optional().nullable();

export const EmptyPayloadSchema = z.object({});
export const IdSchema = z.string().min(1);
export const VoidResponseSchema = z.union([z.null(), z.undefined()]);

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

export const TranscribeAudioPayloadSchema = z.object({
  profileId: IdSchema,
  audioArtifactId: IdSchema,
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
  schema_version: z.literal("1.0.0"),
  text: z.string(),
  t0_ms: z.number().int().nonnegative(),
  t1_ms: z.number().int().nonnegative(),
  seq: z.number().int().nonnegative(),
});

export const AsrCommitEventSchema = z.object({
  schema_version: z.literal("1.0.0"),
  segments: z.array(TranscriptSegmentSchema).min(1),
  seq: z.number().int().nonnegative(),
});

export const AsrFinalProgressEventSchema = z.object({
  schema_version: z.literal("1.0.0"),
  processed_ms: z.number().int().nonnegative(),
  total_ms: z.number().int().nonnegative(),
});

export const AsrFinalResultEventSchema = z.object({
  schema_version: z.literal("1.0.0"),
  text: z.string().min(1),
  segments: z.array(TranscriptSegmentSchema).min(1),
});

export const TranscriptGetPayloadSchema = z.object({
  profileId: IdSchema,
  transcriptId: IdSchema,
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

export type ProfileSummary = z.infer<typeof ProfileSummarySchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type ProjectListItem = z.infer<typeof ProjectListItemSchema>;
export type OutlineDoc = z.infer<typeof OutlineDocSchema>;
export type ExportResult = z.infer<typeof ExportResultSchema>;
export type PackInspectResponse = z.infer<typeof PackInspectResponseSchema>;
export type PeerReviewSummary = z.infer<typeof PeerReviewSummarySchema>;
export type PeerReviewDetail = z.infer<typeof PeerReviewDetailSchema>;
export type RunSummary = z.infer<typeof RunSummarySchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type QuestDaily = z.infer<typeof QuestDailySchema>;
export type QuestAttemptSummary = z.infer<typeof QuestAttemptSummarySchema>;
export type QuestReportItem = z.infer<typeof QuestReportItemSchema>;
export type TranscriptV1 = z.infer<typeof TranscriptV1Schema>;
export type FeedbackV1 = z.infer<typeof FeedbackV1Schema>;
export type FeedbackContext = z.infer<typeof FeedbackContextSchema>;
