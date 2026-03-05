import { invokeChecked } from "@/composables/useIpc";
import {
  AnalyzeResponseSchema,
  IdSchema,
  RunAnalyzePayloadSchema,
  RunCreatePayloadSchema,
  RunFinishPayloadSchema,
  RunGetPayloadSchema,
  RunLatestPayloadSchema,
  RunListPayloadSchema,
  RunSetTranscriptPayloadSchema,
  RunSummary,
  RunSummaryListSchema,
  RunSummaryNullableSchema,
  VoidResponseSchema,
} from "@/schemas/ipc";

export async function createRun(profileId: string, projectId: string) {
  return invokeChecked("run_create", RunCreatePayloadSchema, IdSchema, {
    profileId,
    projectId,
  });
}

export async function finishRun(
  profileId: string,
  runId: string,
  audioArtifactId: string
) {
  await invokeChecked("run_finish", RunFinishPayloadSchema, VoidResponseSchema, {
    profileId,
    runId,
    audioArtifactId,
  });
}

export async function setRunTranscript(
  profileId: string,
  runId: string,
  transcriptId: string
) {
  await invokeChecked(
    "run_set_transcript",
    RunSetTranscriptPayloadSchema,
    VoidResponseSchema,
    {
      profileId,
      runId,
      transcriptId,
    }
  );
}

export async function analyzeRun(profileId: string, runId: string) {
  return invokeChecked("run_analyze", RunAnalyzePayloadSchema, AnalyzeResponseSchema, {
    profileId,
    runId,
  });
}

export async function getLatestRun(
  profileId: string,
  projectId: string
): Promise<RunSummary | null> {
  return invokeChecked("run_get_latest", RunLatestPayloadSchema, RunSummaryNullableSchema, {
    profileId,
    projectId,
  });
}

export async function getRun(
  profileId: string,
  runId: string
): Promise<RunSummary | null> {
  return invokeChecked("run_get", RunGetPayloadSchema, RunSummaryNullableSchema, {
    profileId,
    runId,
  });
}

export async function getRuns(
  profileId: string,
  projectId: string,
  limit = 12
): Promise<RunSummary[]> {
  return invokeChecked("run_list", RunListPayloadSchema, RunSummaryListSchema, {
    profileId,
    projectId,
    limit,
  });
}
