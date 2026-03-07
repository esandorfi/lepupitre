import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProfileWithContext,
  deleteProfileWithContext,
  hasDuplicateName,
  refreshProfileContext,
  switchProfileWithContext,
  toWorkspaceError,
} from "./workspaceSwitcherActions.shared";

const storeMocks = vi.hoisted(() => ({
  talksStore: {
    loadActiveProject: vi.fn(async () => {}),
    loadProjects: vi.fn(async () => {}),
  },
  trainingStore: {
    loadDailyQuest: vi.fn(async () => {}),
  },
  workspaceStore: {
    createProfile: vi.fn(async () => "profile-new"),
    switchProfile: vi.fn(async () => {}),
    deleteProfile: vi.fn(async () => {}),
  },
}));

vi.mock("@/stores/app", () => storeMocks);

describe("workspaceSwitcherActions.shared", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects duplicate names case-insensitively and supports exceptId", () => {
    const profiles = [
      { id: "p1", name: "Alpha" },
      { id: "p2", name: "Beta" },
    ];

    expect(hasDuplicateName(profiles, " alpha ")).toBe(true);
    expect(hasDuplicateName(profiles, "alpha", "p1")).toBe(false);
    expect(hasDuplicateName(profiles, "Gamma")).toBe(false);
  });

  it("localizes recording-active error and passes through others", () => {
    const t = (key: string) => key;

    expect(toWorkspaceError(t, new Error("recording_active in progress"))).toBe(
      "profiles.switch_blocked_recording"
    );
    expect(toWorkspaceError(t, new Error("network failed"))).toBe("network failed");
    expect(toWorkspaceError(t, "plain-error")).toBe("plain-error");
  });

  it("refreshes profile context and wraps create/switch/delete operations", async () => {
    await refreshProfileContext();
    expect(storeMocks.talksStore.loadActiveProject).toHaveBeenCalled();
    expect(storeMocks.talksStore.loadProjects).toHaveBeenCalled();
    expect(storeMocks.trainingStore.loadDailyQuest).toHaveBeenCalled();

    storeMocks.workspaceStore.createProfile.mockResolvedValueOnce("profile-42");
    const created = await createProfileWithContext("New Profile");
    expect(created).toBe("profile-42");
    expect(storeMocks.workspaceStore.createProfile).toHaveBeenCalledWith("New Profile");
    expect(storeMocks.trainingStore.loadDailyQuest).toHaveBeenCalled();

    await switchProfileWithContext("profile-1");
    expect(storeMocks.workspaceStore.switchProfile).toHaveBeenCalledWith("profile-1");

    await deleteProfileWithContext("profile-2");
    expect(storeMocks.workspaceStore.deleteProfile).toHaveBeenCalledWith("profile-2");
  });
});
