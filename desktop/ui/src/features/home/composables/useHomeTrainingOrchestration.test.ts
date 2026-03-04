import { computed, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestAttemptSummary,
  QuestDaily,
} from "@/schemas/ipc";
import { useHomeTrainingOrchestration } from "./useHomeTrainingOrchestration";

const mockAppStore = vi.hoisted(() => ({
  ensureTrainingProject: vi.fn(),
  getDailyQuestForProject: vi.fn(),
  getQuestByCode: vi.fn(),
  getQuestAttempts: vi.fn(),
  getProgressSnapshot: vi.fn(),
  getMascotContextMessage: vi.fn(),
  getQuestList: vi.fn(),
}));

vi.mock("@/stores/app", () => ({
  appStore: mockAppStore,
}));

vi.mock("@/lib/trainingPreferences", () => ({
  readStoredHeroQuestCode: vi.fn(),
  writeStoredHeroQuestCode: vi.fn(),
}));

vi.mock("./useAchievementPulse", () => ({
  evaluateAchievementPulse: vi.fn(),
}));

function createQuest(code: string): Quest {
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
  const activeProfile = ref<string | null>(activeProfileId);
  const locale = ref("en");
  const showMascotCard = computed(() => true);
  const questCategories = computed(() => ["all", "General", "Story"]);
  const trainingProjectId = ref<string | null>("project-old");
  const trainingDailyQuest = ref<QuestDaily | null>(null);
  const selectedHeroQuest = ref<Quest | null>(createQuest("LEGACY"));
  const recentAttempts = ref<QuestAttemptSummary[]>([
    {
      id: "old-attempt",
      quest_code: "LEGACY",
      quest_title: "Legacy quest",
      output_type: "audio",
      created_at: "2026-03-01T10:00:00Z",
      has_audio: true,
      has_transcript: false,
      has_feedback: false,
      feedback_id: null,
    },
  ]);
  const trainingProgress = ref<ProgressSnapshot | null>({
    project_id: "project-old",
    attempts_total: 1,
    feedback_ready_total: 0,
    streak_days: 1,
    weekly_target: 3,
    weekly_completed: 1,
    credits: 10,
    next_milestone: 20,
    last_attempt_at: "2026-03-01T10:00:00Z",
  });
  const mascotMessage = ref<MascotMessage | null>({
    id: "msg-1",
    kind: "nudge",
    title: "Keep going",
    body: "One more quest",
    cta_label: null,
    cta_route: null,
  });
  const trainingError = ref<string | null>("old-error");
  const isTrainingLoading = ref(false);
  const isQuestPickerOpen = ref(false);
  const isQuestPickerLoading = ref(false);
  const questPickerError = ref<string | null>(null);
  const questPickerSearch = ref("old");
  const questPickerCategory = ref("General");
  const questPickerSort = ref<"recent" | "az" | "category">("recent");
  const availableQuests = ref<Quest[]>([]);
  const achievementPulse = ref(null);

  const orchestration = useHomeTrainingOrchestration({
    refs: {
      state: computed(() => ({ activeProfileId: activeProfile.value })),
      locale,
      showMascotCard,
      questCategories,
      trainingProjectId,
      trainingDailyQuest,
      selectedHeroQuest,
      recentAttempts,
      trainingProgress,
      mascotMessage,
      trainingError,
      isTrainingLoading,
      isQuestPickerOpen,
      isQuestPickerLoading,
      questPickerError,
      questPickerSearch,
      questPickerCategory,
      questPickerSort,
      availableQuests,
      achievementPulse,
    },
    t: (key: string) => key,
    toError: (err: unknown) => (err instanceof Error ? err.message : String(err)),
  });

  return {
    activeProfile,
    trainingProjectId,
    trainingDailyQuest,
    selectedHeroQuest,
    recentAttempts,
    trainingProgress,
    mascotMessage,
    trainingError,
    isTrainingLoading,
    isQuestPickerOpen,
    isQuestPickerLoading,
    questPickerError,
    questPickerSearch,
    questPickerCategory,
    questPickerSort,
    availableQuests,
    orchestration,
  };
}

describe("useHomeTrainingOrchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets training state when there is no active profile", async () => {
    const ctx = setup(null);
    await ctx.orchestration.loadTrainingData();

    expect(ctx.trainingProjectId.value).toBeNull();
    expect(ctx.trainingDailyQuest.value).toBeNull();
    expect(ctx.selectedHeroQuest.value).toBeNull();
    expect(ctx.recentAttempts.value).toEqual([]);
    expect(ctx.trainingProgress.value).toBeNull();
    expect(ctx.mascotMessage.value).toBeNull();
    expect(mockAppStore.ensureTrainingProject).not.toHaveBeenCalled();
  });

  it("opens picker and fetches quest list only once when cached", async () => {
    const ctx = setup();
    const quests = [createQuest("Q1"), createQuest("Q2")];
    mockAppStore.getQuestList.mockResolvedValue(quests);

    await ctx.orchestration.openQuestPicker();
    expect(ctx.isQuestPickerOpen.value).toBe(true);
    expect(ctx.availableQuests.value).toEqual(quests);
    expect(mockAppStore.getQuestList).toHaveBeenCalledTimes(1);

    await ctx.orchestration.openQuestPicker();
    expect(mockAppStore.getQuestList).toHaveBeenCalledTimes(1);
  });

  it("focuses quest-map node and updates picker filters", async () => {
    const ctx = setup();
    ctx.availableQuests.value = [createQuest("Q1")];
    ctx.questPickerSearch.value = "needle";
    ctx.questPickerCategory.value = "General";
    ctx.questPickerSort.value = "recent";

    await ctx.orchestration.focusQuestMapNode({
      id: "n1",
      label: "Node",
      reward: 10,
      category: "Story",
      done: false,
      current: true,
      offsetPx: 0,
    });

    expect(ctx.isQuestPickerOpen.value).toBe(true);
    expect(ctx.questPickerCategory.value).toBe("Story");
    expect(ctx.questPickerSort.value).toBe("category");
    expect(ctx.questPickerSearch.value).toBe("");
  });
});
