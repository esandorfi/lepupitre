import { computed, type Ref } from "vue";
import type {
  Quest,
  QuestAttemptSummary,
} from "@/schemas/ipc";
import type { QuestSort } from "@/features/home/composables/homePageModels.shared";

export function createQuestPickerState(params: {
  availableQuests: Ref<Quest[]>;
  questPickerSearch: Ref<string>;
  questPickerCategory: Ref<string>;
  questPickerSort: Ref<QuestSort>;
  recentAttempts: Ref<QuestAttemptSummary[]>;
}) {
  const {
    availableQuests,
    questPickerSearch,
    questPickerCategory,
    questPickerSort,
    recentAttempts,
  } = params;

  const questCategories = computed(() => {
    const categories = Array.from(
      new Set(availableQuests.value.map((quest) => quest.category))
    ).sort();
    return ["all", ...categories];
  });
  const filteredQuests = computed(() => {
    const search = questPickerSearch.value.trim().toLowerCase();
    return availableQuests.value.filter((quest) => {
      if (questPickerCategory.value !== "all" && quest.category !== questPickerCategory.value) {
        return false;
      }
      if (!search) {
        return true;
      }
      return (
        quest.code.toLowerCase().includes(search) ||
        quest.title.toLowerCase().includes(search) ||
        quest.prompt.toLowerCase().includes(search)
      );
    });
  });
  const recentQuestCodes = computed(() => {
    const seen = new Set<string>();
    const codes: string[] = [];
    for (const attempt of recentAttempts.value) {
      if (!seen.has(attempt.quest_code)) {
        seen.add(attempt.quest_code);
        codes.push(attempt.quest_code);
      }
    }
    return codes;
  });
  const recentQuestIndex = computed(() => {
    const map = new Map<string, number>();
    recentQuestCodes.value.forEach((code, index) => map.set(code, index));
    return map;
  });
  const recentPickerQuests = computed(() => {
    const recentSet = new Set(recentQuestCodes.value);
    return filteredQuests.value
      .filter((quest) => recentSet.has(quest.code))
      .sort((a, b) => {
        const aIndex = recentQuestIndex.value.get(a.code) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = recentQuestIndex.value.get(b.code) ?? Number.MAX_SAFE_INTEGER;
        return aIndex - bIndex;
      });
  });
  const pickerMainQuests = computed(() => {
    let list = filteredQuests.value.slice();
    if (questPickerSort.value === "recent" && recentPickerQuests.value.length > 0) {
      const recentSet = new Set(recentPickerQuests.value.map((quest) => quest.code));
      list = list.filter((quest) => !recentSet.has(quest.code));
    }
    if (questPickerSort.value === "category") {
      return list.sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.title.localeCompare(b.title) ||
          a.code.localeCompare(b.code)
      );
    }
    return list.sort((a, b) => a.title.localeCompare(b.title) || a.code.localeCompare(b.code));
  });
  const showRecentQuestSection = computed(
    () => questPickerSort.value === "recent" && recentPickerQuests.value.length > 0
  );
  const pickerVisibleQuests = computed(() => [
    ...recentPickerQuests.value,
    ...pickerMainQuests.value,
  ]);

  return {
    questCategories,
    filteredQuests,
    recentPickerQuests,
    pickerMainQuests,
    showRecentQuestSection,
    pickerVisibleQuests,
  };
}
