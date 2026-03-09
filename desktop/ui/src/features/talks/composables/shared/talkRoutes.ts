/**
 * Returns the talks hub route path.
 */
export function talksRoute() {
  return "/talks";
}

/**
 * Returns the define-page route path for a project.
 */
export function talkDefineRoute(projectId: string) {
  return `/talks/${projectId}/define`;
}

/**
 * Returns the builder-page route path for a project.
 */
export function talkBuilderRoute(projectId: string) {
  return `/talks/${projectId}/builder`;
}

/**
 * Returns the train-page route path for a project.
 */
export function talkTrainRoute(projectId: string) {
  return `/talks/${projectId}/train`;
}

/**
 * Returns the export-page route path for a project.
 */
export function talkExportRoute(projectId: string) {
  return `/talks/${projectId}/export`;
}

/**
 * Returns quest route path with talks origin query metadata.
 */
export function talkQuestRoute(projectId: string, questCode: string) {
  return `/quest/${questCode}?from=talk&projectId=${projectId}`;
}

/**
 * Returns peer-review route path scoped to the active talk project.
 */
export function talkPeerReviewRoute(projectId: string, peerReviewId: string) {
  return `/peer-review/${peerReviewId}?projectId=${projectId}`;
}

/**
 * Returns boss-run route path, optionally pinned to a run id.
 */
export function talkBossRunRoute(runId?: string) {
  if (!runId) {
    return "/boss-run";
  }
  return `/boss-run?runId=${runId}`;
}
