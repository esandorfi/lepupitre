import { describe, expect, it } from "vitest";
import {
  buildContextBreadcrumbs,
  resolvePrimaryNavItems,
  type ShellNavigationContext,
} from "./navigation";

const PROJECT_P7 = {
  id: "p-7",
  title: "Board update",
  audience: null,
  goal: null,
  duration_target_sec: null,
  talk_number: 7,
  stage: "train",
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-01-02T10:00:00Z",
  is_active: true,
} as const;

const ACTIVE_PROJECT_P7 = {
  id: "p-7",
  title: "Board update",
  audience: null,
  goal: null,
  duration_target_sec: null,
  talk_number: 7,
  stage: "train",
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-01-02T10:00:00Z",
} as const;

function baseContext(overrides: Partial<ShellNavigationContext> = {}): ShellNavigationContext {
  return {
    routeName: "training",
    routeParams: {},
    routeQuery: {},
    projects: [],
    activeProject: null,
    lastFeedbackContext: null,
    getTalkNumber: () => null,
    formatQuestCode: (_projectId: string, questCode: string) => questCode,
    ...overrides,
  };
}

describe("resolvePrimaryNavItems", () => {
  it("marks current talk as disabled when no active project exists", () => {
    const items = resolvePrimaryNavItems(baseContext(), (key) => key);
    const currentTalk = items.find((item) => item.id === "current-talk");
    expect(currentTalk?.disabled).toBe(true);
    expect(currentTalk?.to).toBe("/talks");
  });

  it("marks current talk as active on talk routes", () => {
    const context = baseContext({
      routeName: "talk-train",
      routeParams: { projectId: "p-1" },
      projects: [
        {
          id: "p-1",
          title: "Launch plan",
          audience: null,
          goal: null,
          duration_target_sec: null,
          talk_number: 3,
          stage: "train",
          created_at: "2026-01-01T10:00:00Z",
          updated_at: "2026-01-02T10:00:00Z",
          is_active: true,
        },
      ],
      activeProject: {
        id: "p-1",
        title: "Launch plan",
        audience: null,
        goal: null,
        duration_target_sec: null,
        talk_number: 3,
        stage: "train",
        created_at: "2026-01-01T10:00:00Z",
        updated_at: "2026-01-02T10:00:00Z",
      },
      getTalkNumber: () => 3,
    });

    const items = resolvePrimaryNavItems(context, (key) => key);
    const currentTalk = items.find((item) => item.id === "current-talk");
    expect(currentTalk?.disabled).toBe(false);
    expect(currentTalk?.active).toBe(true);
    expect(currentTalk?.to).toBe("/talks/p-1/train");
  });

  it("marks current talk as active on feedback route from feedback context", () => {
    const context = baseContext({
      routeName: "feedback",
      routeParams: { feedbackId: "fb-22" },
      projects: [PROJECT_P7],
      activeProject: ACTIVE_PROJECT_P7,
      lastFeedbackContext: {
        subject_type: "attempt",
        subject_id: "att-1",
        project_id: "p-7",
        quest_code: "Q-15",
        quest_title: "Talk opener",
        run_id: null,
      },
      getTalkNumber: () => 7,
    });

    const items = resolvePrimaryNavItems(context, (key) => key);
    const currentTalk = items.find((item) => item.id === "current-talk");
    expect(currentTalk?.active).toBe(true);
    expect(currentTalk?.to).toBe("/talks/p-7/train");
  });

  it("does not mark current talk active on non-talk routes", () => {
    const context = baseContext({
      routeName: "help",
      projects: [PROJECT_P7],
      activeProject: ACTIVE_PROJECT_P7,
    });

    const items = resolvePrimaryNavItems(context, (key) => key);
    const currentTalk = items.find((item) => item.id === "current-talk");
    expect(currentTalk?.active).toBe(false);
  });
});

describe("buildContextBreadcrumbs", () => {
  it("builds quest breadcrumbs with formatted quest code", () => {
    const breadcrumbs = buildContextBreadcrumbs(
      baseContext({
        routeName: "quest",
        routeParams: { questCode: "Q-15", projectId: "p-7" },
        activeProject: ACTIVE_PROJECT_P7,
        projects: [PROJECT_P7],
        getTalkNumber: () => 7,
        formatQuestCode: (_projectId: string, questCode: string) => `T7-${questCode}`,
      }),
      (key) => key
    );

    expect(breadcrumbs.length).toBe(2);
    expect(breadcrumbs[0]?.to).toBe("/talks/p-7/train");
    expect(breadcrumbs[1]?.label).toBe("T7-Q-15");
    expect(breadcrumbs[1]?.to).toBe("/quest/Q-15?from=talk&projectId=p-7");
  });

  it("builds feedback breadcrumbs from feedback context", () => {
    const breadcrumbs = buildContextBreadcrumbs(
      baseContext({
        routeName: "feedback",
        routeParams: { feedbackId: "fb-22" },
        projects: [PROJECT_P7],
        activeProject: ACTIVE_PROJECT_P7,
        lastFeedbackContext: {
          subject_type: "attempt",
          subject_id: "att-1",
          project_id: "p-7",
          quest_code: "Q-15",
          quest_title: "Talk opener",
          run_id: null,
        },
        getTalkNumber: () => 7,
        formatQuestCode: (_projectId: string, questCode: string) => `T7-${questCode}`,
      }),
      (key) => key
    );

    expect(breadcrumbs.length).toBe(3);
    expect(breadcrumbs[0]?.to).toBe("/talks/p-7/train");
    expect(breadcrumbs[1]?.label).toBe("T7-Q-15");
    expect(breadcrumbs[1]?.to).toBe("/quest/Q-15?from=talk&projectId=p-7");
    expect(breadcrumbs[2]?.to).toBe("/feedback/fb-22");
  });

  it("builds peer review breadcrumb with project query context", () => {
    const breadcrumbs = buildContextBreadcrumbs(
      baseContext({
        routeName: "peer-review",
        routeParams: { peerReviewId: "pr-42" },
        routeQuery: { projectId: "p-7" },
        projects: [PROJECT_P7],
        activeProject: ACTIVE_PROJECT_P7,
        getTalkNumber: () => 7,
      }),
      (key) => key
    );

    expect(breadcrumbs.length).toBe(2);
    expect(breadcrumbs[0]?.to).toBe("/talks/p-7/train");
    expect(breadcrumbs[1]?.to).toBe("/peer-review/pr-42?projectId=p-7");
  });

  it("does not emit talk breadcrumbs on onboarding/help routes", () => {
    const onboardingCrumbs = buildContextBreadcrumbs(
      baseContext({
        routeName: "onboarding",
        projects: [PROJECT_P7],
        activeProject: ACTIVE_PROJECT_P7,
      }),
      (key) => key
    );
    const helpCrumbs = buildContextBreadcrumbs(
      baseContext({
        routeName: "help",
        projects: [PROJECT_P7],
        activeProject: ACTIVE_PROJECT_P7,
      }),
      (key) => key
    );

    expect(onboardingCrumbs).toEqual([]);
    expect(helpCrumbs).toEqual([]);
  });
});
