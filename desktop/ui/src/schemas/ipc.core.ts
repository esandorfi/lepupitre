import { z } from "zod";

const OptionalString = z.string().min(1).optional().nullable();

export const EmptyPayloadSchema = z.object({});
export const IdSchema = z.string().min(1);
export const VoidResponseSchema = z.union([z.null(), z.undefined()]);
export const AsrSidecarDependenciesSchema = z
  .object({
    whisperRs: z.string().min(1),
    whisperCpp: z.string().min(1),
    whisperRuntime: z.string().min(1),
    ggml: z.string().min(1),
  })
  .strict();

export const AsrSidecarStatusResponseSchema = z
  .object({
    path: z.string().min(1),
    schemaVersion: z.string().min(1),
    sidecarVersion: z.string().min(1),
    protocolVersion: z.string().min(1),
    appProtocolVersion: z.string().min(1),
    targetTriple: z.string().min(1),
    buildTimestamp: z.string().min(1).optional().nullable(),
    gitCommit: z.string().min(1).optional().nullable(),
    capabilities: z.array(z.string().min(1)),
    dependencies: AsrSidecarDependenciesSchema,
  })
  .strict();
export const AsrDiagnosticsExportResponseSchema = z
  .object({
    path: z.string().min(1),
  })
  .strict();
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

