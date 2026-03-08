import type {
  PeerReviewSummary,
  QuestAttemptSummary,
  QuestReportItem,
  RunSummary,
} from "@/schemas/ipc";
import type { RuntimeUiErrorState } from "@/features/shared/runtime/runtimeContract";

const DEFAULT_ACTIVITY_LIMIT = 12;

type TalkArtifactsBaseDeps = {
  getQuestReport: (projectId: string) => Promise<QuestReportItem[]>;
  getRuns: (projectId: string, limit: number) => Promise<RunSummary[]>;
  getPeerReviews: (projectId: string, limit: number) => Promise<PeerReviewSummary[]>;
};

type TalkArtifactsWithAttemptsDeps = TalkArtifactsBaseDeps & {
  getQuestAttempts: (projectId: string, limit: number) => Promise<QuestAttemptSummary[]>;
};

export type TalkArtifactsBase = {
  report: QuestReportItem[];
  runs: RunSummary[];
  peerReviews: PeerReviewSummary[];
};

export type TalkArtifactsWithAttempts = TalkArtifactsBase & {
  attempts: QuestAttemptSummary[];
};

type LoadTalkPageDataArgs<TArtifacts> = {
  bootstrapSession: () => Promise<void>;
  loadProjects: () => Promise<void>;
  projectId: string;
  isStale: () => boolean;
  onProjectMissing: (ui: RuntimeUiErrorState) => void;
  ui: RuntimeUiErrorState;
  loadArtifacts: (projectId: string) => Promise<TArtifacts>;
};

export async function loadTalkArtifactsBase(
  deps: TalkArtifactsBaseDeps,
  projectId: string,
  limit = DEFAULT_ACTIVITY_LIMIT
): Promise<TalkArtifactsBase> {
  const [report, runs, peerReviews] = await Promise.all([
    deps.getQuestReport(projectId),
    deps.getRuns(projectId, limit),
    deps.getPeerReviews(projectId, limit),
  ]);
  return { report, runs, peerReviews };
}

export async function loadTalkArtifactsWithAttempts(
  deps: TalkArtifactsWithAttemptsDeps,
  projectId: string,
  limit = DEFAULT_ACTIVITY_LIMIT
): Promise<TalkArtifactsWithAttempts> {
  const [base, attempts] = await Promise.all([
    loadTalkArtifactsBase(deps, projectId, limit),
    deps.getQuestAttempts(projectId, limit),
  ]);
  return { ...base, attempts };
}

export async function loadTalkPageData<TArtifacts>(
  args: LoadTalkPageDataArgs<TArtifacts>
): Promise<TArtifacts | null> {
  await args.bootstrapSession();
  if (args.isStale()) {
    return null;
  }

  await args.loadProjects();
  if (args.isStale()) {
    return null;
  }

  if (!args.projectId) {
    args.onProjectMissing(args.ui);
    return null;
  }

  const artifacts = await args.loadArtifacts(args.projectId);
  if (args.isStale()) {
    return null;
  }

  return artifacts;
}
