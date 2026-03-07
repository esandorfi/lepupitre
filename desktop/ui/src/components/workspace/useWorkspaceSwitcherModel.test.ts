import { ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import type { Theme } from "@/lib/theme";
import type { ProfileSummary } from "@/schemas/ipc";
import { appState } from "@/stores/app";
import { createWorkspaceSwitcherModel } from "./useWorkspaceSwitcherModel";

type AppStateSnapshot = {
  profiles: ProfileSummary[];
  activeProfileId: string | null;
  hasBootstrapped: boolean;
  isBootstrapping: boolean;
  activeProject: typeof appState.activeProject;
  trainingProjectId: string | null;
  projects: typeof appState.projects;
  dailyQuest: typeof appState.dailyQuest;
  recentAttempts: typeof appState.recentAttempts;
  lastAttemptId: string | null;
  lastFeedbackId: string | null;
  lastFeedbackContext: typeof appState.lastFeedbackContext;
};

function profile(
  id: string,
  name: string,
  options: { createdAt?: string; lastOpenedAt?: string | null; talks?: number; size?: number } = {}
): ProfileSummary {
  return {
    id,
    name,
    created_at: options.createdAt ?? "2026-03-01T10:00:00Z",
    last_opened_at: options.lastOpenedAt ?? null,
    is_active: false,
    talks_count: options.talks ?? 0,
    size_bytes: options.size ?? 0,
  };
}

function snapshotAppState(): AppStateSnapshot {
  return {
    profiles: [...appState.profiles],
    activeProfileId: appState.activeProfileId,
    hasBootstrapped: appState.hasBootstrapped,
    isBootstrapping: appState.isBootstrapping,
    activeProject: appState.activeProject,
    trainingProjectId: appState.trainingProjectId,
    projects: [...appState.projects],
    dailyQuest: appState.dailyQuest,
    recentAttempts: [...appState.recentAttempts],
    lastAttemptId: appState.lastAttemptId,
    lastFeedbackId: appState.lastFeedbackId,
    lastFeedbackContext: appState.lastFeedbackContext,
  };
}

function restoreAppState(snapshot: AppStateSnapshot) {
  appState.profiles = [...snapshot.profiles];
  appState.activeProfileId = snapshot.activeProfileId;
  appState.hasBootstrapped = snapshot.hasBootstrapped;
  appState.isBootstrapping = snapshot.isBootstrapping;
  appState.activeProject = snapshot.activeProject;
  appState.trainingProjectId = snapshot.trainingProjectId;
  appState.projects = [...snapshot.projects];
  appState.dailyQuest = snapshot.dailyQuest;
  appState.recentAttempts = [...snapshot.recentAttempts];
  appState.lastAttemptId = snapshot.lastAttemptId;
  appState.lastFeedbackId = snapshot.lastFeedbackId;
  appState.lastFeedbackContext = snapshot.lastFeedbackContext;
}

const initialState = snapshotAppState();

afterEach(() => {
  restoreAppState(initialState);
});

function setupModel() {
  const search = ref("");
  const deleteTarget = ref<{ id: string; name: string } | null>(null);
  const toolbarColorTick = ref(0);
  const theme = ref<Theme>("orange");
  const model = createWorkspaceSwitcherModel({
    search,
    deleteTarget,
    toolbarColorTick,
    t: (key: string) => key,
    theme,
  });
  return { model, search, deleteTarget };
}

describe("useWorkspaceSwitcherModel", () => {
  it("computes recent and main profile sections when enough profiles are listed", () => {
    appState.profiles = [
      profile("p1", "Alpha", { lastOpenedAt: "2026-03-07T08:00:00Z" }),
      profile("p2", "Beta", { lastOpenedAt: "2026-03-07T09:00:00Z" }),
      profile("p3", "Gamma", { lastOpenedAt: "2026-03-07T07:00:00Z" }),
      profile("p4", "Delta", { lastOpenedAt: "2026-03-06T07:00:00Z" }),
      profile("p5", "Epsilon"),
      profile("p6", "Eta"),
      profile("p7", "Iota"),
      profile("p8", "Kappa"),
      profile("p9", "Lambda"),
      profile("p10", "Mu"),
      profile("p11", "Nu"),
    ];
    appState.activeProfileId = "p1";

    const { model, search } = setupModel();

    expect(model.showSearch.value).toBe(true);
    expect(model.showRecentSection.value).toBe(true);
    expect(model.recentProfiles.value.map((item) => item.id)).toEqual(["p2", "p3", "p4"]);
    expect(model.mainProfiles.value.map((item) => item.id)).toContain("p1");
    expect(model.mainProfiles.value.map((item) => item.id)).not.toContain("p2");
    expect(model.mainProfiles.value.map((item) => item.id)).not.toContain("p3");
    expect(model.mainProfiles.value.map((item) => item.id)).not.toContain("p4");
    expect(model.mainProfiles.value).toHaveLength(8);

    search.value = "eps";
    expect(model.recentProfiles.value).toEqual([]);
    expect(model.mainProfiles.value.map((item) => item.id)).toEqual(["p5"]);
  });

  it("exposes correct current label based on active profile and bootstrap state", () => {
    appState.profiles = [profile("p1", "Alpha")];
    appState.activeProfileId = "p1";
    appState.isBootstrapping = false;

    const { model } = setupModel();
    expect(model.currentLabel.value).toBe("Alpha");

    appState.activeProfileId = null;
    appState.isBootstrapping = true;
    expect(model.currentLabel.value).toBe("shell.workspaces_loading");

    appState.isBootstrapping = false;
    expect(model.currentLabel.value).toBe("shell.workspaces_none");
  });

  it("formats delete dialog strings and row metadata labels", () => {
    const { model, deleteTarget } = setupModel();

    deleteTarget.value = { id: "p1", name: "Alpha" };
    expect(model.deleteDialogTitle.value).toBe('profiles.delete_title_prefix "Alpha" ?');
    expect(model.deleteDialogBody.value).toBe(
      'profiles.delete_body_prefix "Alpha" profiles.delete_body_suffix'
    );
    expect(model.workspaceMetaLabel(profile("p1", "Alpha", { talks: 1, size: 1536 }))).toBe(
      "1 talk - 2 KB"
    );
    expect(model.workspaceMetaLabel(profile("p2", "Beta", { talks: 4, size: 3584 }))).toBe(
      "4 talks - 4 KB"
    );
    expect(model.rowMenuButtonAriaLabel("Alpha")).toBe("shell.workspaces_more_actions Alpha");
  });
});
