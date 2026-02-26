import type { FeedbackContext, ProjectListItem, ProjectSummary } from "../schemas/ipc";

export type PrimaryNavIcon = "training" | "talks" | "current-talk";

export type PrimaryNavItem = {
  id: "training" | "talks" | "current-talk";
  labelKey: string;
  icon: PrimaryNavIcon;
  to: (context: ShellNavigationContext) => string;
  badge?: (context: ShellNavigationContext) => number | null;
  disabled?: (context: ShellNavigationContext) => boolean;
  active?: (context: ShellNavigationContext) => boolean;
};

export type ResolvedPrimaryNavItem = {
  id: PrimaryNavItem["id"];
  label: string;
  icon: PrimaryNavIcon;
  to: string;
  badge: number | null;
  disabled: boolean;
  active: boolean;
};

export type ContextBreadcrumb = {
  label: string;
  to?: string;
};

type RouteName =
  | "training"
  | "talks"
  | "talk-define"
  | "talk-builder"
  | "talk-train"
  | "talk-export"
  | "talk-report"
  | "quest"
  | "feedback"
  | "boss-run"
  | "peer-review"
  | "profiles"
  | "project-new"
  | "builder"
  | "packs"
  | "settings"
  | "about";

export type ShellNavigationContext = {
  routeName: string | null;
  routeParams: Record<string, unknown>;
  routeQuery: Record<string, unknown>;
  projects: ProjectListItem[];
  activeProject: ProjectSummary | null;
  lastFeedbackContext: FeedbackContext | null;
  getTalkNumber: (projectId: string) => number | null;
  formatQuestCode: (projectId: string, questCode: string) => string;
};

type TranslateFn = (key: string) => string;

const TALK_ROUTE_NAMES: ReadonlySet<RouteName> = new Set([
  "talk-define",
  "talk-builder",
  "talk-train",
  "talk-export",
  "talk-report",
  "quest",
  "feedback",
  "boss-run",
  "peer-review",
]);

const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  {
    id: "training",
    labelKey: "nav.training",
    icon: "training",
    to: () => "/training",
    active: (context) => context.routeName === "training",
  },
  {
    id: "talks",
    labelKey: "nav.talk",
    icon: "talks",
    to: () => "/talks",
    badge: (context) => context.projects.length,
    active: (context) => context.routeName === "talks",
  },
  {
    id: "current-talk",
    labelKey: "nav.current_talk",
    icon: "current-talk",
    to: (context) => {
      const id = context.activeProject?.id ?? "";
      return id ? `/talks/${id}/train` : "/talks";
    },
    disabled: (context) => !context.activeProject,
    active: (context) => {
      const currentId = context.activeProject?.id ?? "";
      if (!currentId || !isTalkRoute(context.routeName)) {
        return false;
      }
      return resolveActiveTalkId(context) === currentId;
    },
  },
];

function readValue(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return "";
}

function truncate(value: string, max = 18): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

function isTalkRoute(routeName: string | null): routeName is RouteName {
  return Boolean(routeName && TALK_ROUTE_NAMES.has(routeName as RouteName));
}

function resolveActiveTalkId(context: ShellNavigationContext): string {
  const paramId = readValue(context.routeParams, "projectId");
  if (paramId) {
    return paramId;
  }
  const queryId = readValue(context.routeQuery, "projectId");
  if (queryId) {
    return queryId;
  }
  if (context.routeName === "feedback") {
    return context.lastFeedbackContext?.project_id ?? "";
  }
  if (context.routeName === "boss-run") {
    return context.activeProject?.id ?? "";
  }
  return "";
}

function resolveActiveQuestCode(context: ShellNavigationContext): string {
  if (context.routeName === "quest") {
    return readValue(context.routeParams, "questCode");
  }
  if (context.routeName === "feedback") {
    return context.lastFeedbackContext?.quest_code ?? "";
  }
  return "";
}

function resolveActiveFeedbackId(context: ShellNavigationContext): string {
  if (context.routeName !== "feedback") {
    return "";
  }
  return readValue(context.routeParams, "feedbackId");
}

function resolveActivePeerReviewId(context: ShellNavigationContext): string {
  if (context.routeName !== "peer-review") {
    return "";
  }
  return readValue(context.routeParams, "peerReviewId");
}

function resolveCurrentTalkLabel(context: ShellNavigationContext, t: TranslateFn): string {
  const currentTalk = context.activeProject;
  if (!currentTalk) {
    return t("nav.current_talk");
  }
  const number = currentTalk.talk_number;
  const prefix = number ? `T${number} ` : "";
  return `${prefix}${truncate(currentTalk.title, 16)}`;
}

function resolveTalkCrumbLabel(context: ShellNavigationContext, t: TranslateFn): string {
  const activeTalkId = resolveActiveTalkId(context);
  const activeTalkTitle =
    context.projects.find((project) => project.id === activeTalkId)?.title ??
    context.activeProject?.title ??
    null;
  if (!activeTalkTitle) {
    return t("nav.talk");
  }
  const activeTalkNumber = activeTalkId
    ? context.getTalkNumber(activeTalkId)
    : context.activeProject?.talk_number ?? null;
  const prefix = activeTalkNumber ? `T${activeTalkNumber} ` : "";
  return `${prefix}${truncate(activeTalkTitle)}`;
}

export function resolvePrimaryNavItems(
  context: ShellNavigationContext,
  t: TranslateFn
): ResolvedPrimaryNavItem[] {
  return PRIMARY_NAV_ITEMS.map((item) => {
    let label = t(item.labelKey);
    if (item.id === "current-talk") {
      label = resolveCurrentTalkLabel(context, t);
    }
    return {
      id: item.id,
      label,
      icon: item.icon,
      to: item.to(context),
      badge: item.badge?.(context) ?? null,
      disabled: item.disabled?.(context) ?? false,
      active: item.active?.(context) ?? false,
    };
  });
}

export function buildContextBreadcrumbs(
  context: ShellNavigationContext,
  t: TranslateFn
): ContextBreadcrumb[] {
  const activeTalkId = resolveActiveTalkId(context);
  const activeQuestCode = resolveActiveQuestCode(context);
  const activeFeedbackId = resolveActiveFeedbackId(context);
  const activePeerReviewId = resolveActivePeerReviewId(context);
  const talkReportLink = activeTalkId ? `/talks/${activeTalkId}/train` : "/talks";
  const projectId = activeTalkId || context.activeProject?.id || "";
  const questLink = activeQuestCode
    ? projectId
      ? `/quest/${activeQuestCode}?from=talk&projectId=${projectId}`
      : `/quest/${activeQuestCode}`
    : "/";
  const feedbackLink = activeFeedbackId ? `/feedback/${activeFeedbackId}` : "/";
  const peerReviewProjectId = readValue(context.routeQuery, "projectId");
  const peerReviewLink = activePeerReviewId
    ? peerReviewProjectId
      ? `/peer-review/${activePeerReviewId}?projectId=${peerReviewProjectId}`
      : `/peer-review/${activePeerReviewId}`
    : "/";

  const items: ContextBreadcrumb[] = [];

  if (isTalkRoute(context.routeName)) {
    items.push({
      label: resolveTalkCrumbLabel(context, t),
      to: talkReportLink,
    });
  }

  if (context.routeName === "boss-run") {
    items.push({ label: t("nav.boss_run"), to: "/boss-run" });
  }

  if (activeQuestCode) {
    items.push({
      label: context.formatQuestCode(projectId, activeQuestCode),
      to: questLink,
    });
  }

  if (activeFeedbackId) {
    items.push({
      label: truncate(activeFeedbackId, 10),
      to: feedbackLink,
    });
  }

  if (activePeerReviewId) {
    items.push({
      label: truncate(activePeerReviewId, 10),
      to: peerReviewLink,
    });
  }

  return items;
}
