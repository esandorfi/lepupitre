export function talksRoute() {
  return "/talks";
}

export function talkDefineRoute(projectId: string) {
  return `/talks/${projectId}/define`;
}

export function talkBuilderRoute(projectId: string) {
  return `/talks/${projectId}/builder`;
}

export function talkTrainRoute(projectId: string) {
  return `/talks/${projectId}/train`;
}

export function talkExportRoute(projectId: string) {
  return `/talks/${projectId}/export`;
}

export function talkQuestRoute(projectId: string, questCode: string) {
  return `/quest/${questCode}?from=talk&projectId=${projectId}`;
}

export function talkPeerReviewRoute(projectId: string, peerReviewId: string) {
  return `/peer-review/${peerReviewId}?projectId=${projectId}`;
}

export function talkBossRunRoute(runId?: string) {
  if (!runId) {
    return "/boss-run";
  }
  return `/boss-run?runId=${runId}`;
}
