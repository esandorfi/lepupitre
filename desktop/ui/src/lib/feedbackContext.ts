import type { FeedbackContext } from "../schemas/ipc";

/**
 * Resolves resolve feedback back link from current inputs.
 */
export function resolveFeedbackBackLink(
  context: FeedbackContext | null,
  activeProjectId: string | null
): string {
  if (context?.subject_type === "run") {
    return context.run_id ? `/boss-run?runId=${context.run_id}` : "/boss-run";
  }
  if (context?.quest_code && context?.project_id) {
    return `/quest/${context.quest_code}?from=talk&projectId=${context.project_id}`;
  }
  if (activeProjectId) {
    return `/talks/${activeProjectId}`;
  }
  return "/";
}

/**
 * Resolves resolve feedback context label from current inputs.
 */
export function resolveFeedbackContextLabel(
  context: FeedbackContext | null,
  formatQuestCode: (projectId: string, questCode: string) => string,
  runLabel: string
): string {
  if (context?.subject_type === "run") {
    return runLabel;
  }
  if (context?.quest_code && context?.project_id) {
    return formatQuestCode(context.project_id, context.quest_code);
  }
  return "";
}
