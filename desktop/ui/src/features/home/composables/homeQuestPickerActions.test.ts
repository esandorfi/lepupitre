import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { Quest } from "@/schemas/ipc";
import type { HomeOrchestrationStateRefs } from "./homeTrainingOrchestration.shared";
import { createHomeQuestPickerActions } from "./homeQuestPickerActions";

const mockTrainingStore = vi.hoisted(() => ({
  getQuestList: vi.fn(),
}));

vi.mock("@/stores/app", () => ({
  trainingStore: mockTrainingStore,
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

describe("homeQuestPickerActions", () => {
  it("opens picker once and focuses selected map node category", async () => {
    const availableQuests = ref<Quest[]>([]);
    mockTrainingStore.getQuestList.mockResolvedValue([quest("Q1")]);
    const refs: HomeOrchestrationStateRefs = {
      state: computed(() => ({ activeProfileId: "profile-1" })),
      locale: ref("en"),
      showMascotCard: computed(() => true),
      questCategories: computed(() => ["all", "General", "Story"]),
      trainingProjectId: ref<string | null>(null),
      trainingDailyQuest: ref(null),
      selectedHeroQuest: ref<Quest | null>(null),
      recentAttempts: ref([]),
      trainingProgress: ref(null),
      mascotMessage: ref(null),
      trainingError: ref<string | null>(null),
      isTrainingLoading: ref(false),
      isQuestPickerOpen: ref(false),
      isQuestPickerLoading: ref(false),
      questPickerError: ref<string | null>(null),
      questPickerSearch: ref("legacy"),
      questPickerCategory: ref("all"),
      questPickerSort: ref<"recent" | "az" | "category">("recent"),
      availableQuests,
      achievementPulse: ref(null),
    };

    const actions = createHomeQuestPickerActions({
      toError: (err: unknown) => (err instanceof Error ? err.message : String(err)),
      refs,
    });

    await actions.focusQuestMapNode({
      id: "node-1",
      label: "Node",
      reward: 10,
      category: "Story",
      done: false,
      current: true,
      offsetPx: 0,
    });

    expect(mockTrainingStore.getQuestList).toHaveBeenCalledTimes(1);
    expect(availableQuests.value).toHaveLength(1);
    expect(refs.questPickerCategory.value).toBe("Story");
    expect(refs.questPickerSort.value).toBe("category");
    expect(refs.questPickerSearch.value).toBe("");
  });
});
