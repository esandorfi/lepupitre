import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { ProgressSnapshot, Quest, QuestDaily } from "@/schemas/ipc";
import type { HomeOrchestrationOptions } from "./homeTrainingOrchestration.shared";
import { createHomeTrainingDataActions } from "./homeTrainingDataActions";

const mockTrainingStore = vi.hoisted(() => ({
  ensureTrainingProject: vi.fn(),
  getDailyQuestForProject: vi.fn(),
  getQuestByCode: vi.fn(),
  getQuestAttempts: vi.fn(),
  getQuestList: vi.fn(),
}));

const mockCoachStore = vi.hoisted(() => ({
  getProgressSnapshot: vi.fn(),
  getMascotContextMessage: vi.fn(),
}));

const mockReadStoredHeroQuestCode = vi.hoisted(() => vi.fn());
const mockWriteStoredHeroQuestCode = vi.hoisted(() => vi.fn());
const mockEvaluateAchievementPulse = vi.hoisted(() => vi.fn());

vi.mock("@/stores/app", () => ({
  trainingStore: mockTrainingStore,
  coachStore: mockCoachStore,
}));

vi.mock("@/lib/trainingPreferences", () => ({
  readStoredHeroQuestCode: mockReadStoredHeroQuestCode,
  writeStoredHeroQuestCode: mockWriteStoredHeroQuestCode,
}));

vi.mock("./useAchievementPulse", () => ({
  evaluateAchievementPulse: mockEvaluateAchievementPulse,
}));

function quest(code: string): Quest {
  return {
    code,
    title: `Quest ${code}`,
    prompt: "Prompt",
    category: "General",
    output_type: "audio",
    estimated_sec: 90,
  } as unknown as Quest;
}

function setup(activeProfileId: string | null = "profile-1") {
  const refs: HomeOrchestrationOptions["refs"] = {
    state: computed(() => ({ activeProfileId })),
    locale: ref("en"),
    showMascotCard: computed(() => true),
    questCategories: computed(() => ["all", "General"]),
    trainingProjectId: ref<string | null>(null),
    trainingDailyQuest: ref<QuestDaily | null>(null),
    selectedHeroQuest: ref<Quest | null>(null),
    recentAttempts: ref([]),
    trainingProgress: ref<ProgressSnapshot | null>(null),
    mascotMessage: ref(null),
    trainingError: ref<string | null>(null),
    isTrainingLoading: ref(false),
    isQuestPickerOpen: ref(false),
    isQuestPickerLoading: ref(false),
    questPickerError: ref<string | null>(null),
    questPickerSearch: ref(""),
    questPickerCategory: ref("all"),
    questPickerSort: ref("recent"),
    availableQuests: ref<Quest[]>([]),
    achievementPulse: ref(null),
  };

  const options: HomeOrchestrationOptions = {
    refs,
    t: (key: string) => key,
    toError: (err: unknown) => (err instanceof Error ? err.message : String(err)),
  };

  return { refs, actions: createHomeTrainingDataActions(options) };
}

describe("homeTrainingDataActions", () => {
  it("resets state when active profile is missing", async () => {
    const ctx = setup(null);
    ctx.refs.trainingProjectId.value = "project-1";
    ctx.refs.trainingProgress.value = {
      project_id: "project-1",
      attempts_total: 1,
      feedback_ready_total: 0,
      streak_days: 1,
      weekly_target: 3,
      weekly_completed: 1,
      credits: 10,
      next_milestone: 20,
      last_attempt_at: null,
    };

    await ctx.actions.loadTrainingData();

    expect(ctx.refs.trainingProjectId.value).toBeNull();
    expect(ctx.refs.trainingProgress.value).toBeNull();
    expect(ctx.refs.mascotMessage.value).toBeNull();
  });

  it("loads training data and restores stored hero quest", async () => {
    const ctx = setup("profile-1");
    const dailyQuest = {
      quest: quest("DAILY"),
      why: "daily target",
      due_boss_run: false,
    } as QuestDaily;
    const storedQuest = quest("STORED");
    mockTrainingStore.ensureTrainingProject.mockResolvedValue("project-1");
    mockTrainingStore.getDailyQuestForProject.mockResolvedValue(dailyQuest);
    mockReadStoredHeroQuestCode.mockReturnValue("STORED");
    mockTrainingStore.getQuestByCode.mockResolvedValue(storedQuest);
    mockTrainingStore.getQuestAttempts.mockResolvedValue([]);
    mockCoachStore.getProgressSnapshot.mockResolvedValue({
      project_id: "project-1",
      attempts_total: 1,
      feedback_ready_total: 0,
      streak_days: 1,
      weekly_target: 3,
      weekly_completed: 1,
      credits: 10,
      next_milestone: 20,
      last_attempt_at: null,
    });
    mockCoachStore.getMascotContextMessage.mockResolvedValue(null);
    mockEvaluateAchievementPulse.mockReturnValue(null);

    await ctx.actions.loadTrainingData();

    expect(ctx.refs.trainingProjectId.value).toBe("project-1");
    expect(ctx.refs.trainingDailyQuest.value?.quest.code).toBe("DAILY");
    expect(ctx.refs.selectedHeroQuest.value?.code).toBe("STORED");
    expect(mockTrainingStore.getQuestByCode).toHaveBeenCalledWith("STORED");
    expect(ctx.refs.isTrainingLoading.value).toBe(false);
  });
});
