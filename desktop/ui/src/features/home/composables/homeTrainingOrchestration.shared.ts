import type { ComputedRef, Ref } from "vue";
import type { QuestMapNode } from "@/features/home/composables/useHomePresentation";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestAttemptSummary,
  QuestDaily,
} from "@/schemas/ipc";
import type { AchievementPulse } from "@/features/home/composables/useAchievementPulse";

export type Translate = (key: string) => string;

export type HomePickerSort = "recent" | "az" | "category";

export type HomeOrchestrationStateRefs = {
  state: ComputedRef<{ activeProfileId: string | null }>;
  locale: Ref<string>;
  showMascotCard: ComputedRef<boolean>;
  questCategories: ComputedRef<string[]>;
  trainingProjectId: Ref<string | null>;
  trainingDailyQuest: Ref<QuestDaily | null>;
  selectedHeroQuest: Ref<Quest | null>;
  recentAttempts: Ref<QuestAttemptSummary[]>;
  trainingProgress: Ref<ProgressSnapshot | null>;
  mascotMessage: Ref<MascotMessage | null>;
  trainingError: Ref<string | null>;
  isTrainingLoading: Ref<boolean>;
  isQuestPickerOpen: Ref<boolean>;
  isQuestPickerLoading: Ref<boolean>;
  questPickerError: Ref<string | null>;
  questPickerSearch: Ref<string>;
  questPickerCategory: Ref<string>;
  questPickerSort: Ref<HomePickerSort>;
  availableQuests: Ref<Quest[]>;
  achievementPulse: Ref<AchievementPulse | null>;
};

export type HomeOrchestrationOptions = {
  refs: HomeOrchestrationStateRefs;
  t: Translate;
  toError: (err: unknown) => string;
};

export type FocusQuestMapNode = (node: QuestMapNode) => Promise<void>;
