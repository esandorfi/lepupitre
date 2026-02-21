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
  stage: z.string().min(1),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export const ProjectSummaryNullableSchema = ProjectSummarySchema.nullable();

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

export const QuestSubmitTextPayloadSchema = z.object({
  profileId: IdSchema,
  projectId: IdSchema,
  questCode: z.string().min(1),
  text: z.string().min(1),
});

export type ProfileSummary = z.infer<typeof ProfileSummarySchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type QuestDaily = z.infer<typeof QuestDailySchema>;
