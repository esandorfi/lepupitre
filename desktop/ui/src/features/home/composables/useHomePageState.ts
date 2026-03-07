import { computed, ref } from "vue";
import { useI18n } from "@/lib/i18n";
import { writeStoredHeroQuestCode } from "@/lib/trainingPreferences";
import { useUiPreferences } from "@/lib/uiPreferences";
import { appState, trainingStore } from "@/stores/app";
import { useHomePresentation } from "@/features/home/composables/useHomePresentation";
import { useHomeQuestSelection } from "@/features/home/composables/useHomeQuestSelection";
import { useHomeTrainingOrchestration } from "@/features/home/composables/useHomeTrainingOrchestration";
import { useQuestPickerNavigation } from "@/features/home/composables/useQuestPickerNavigation";
import {
  bindHomePageEffects,
  createGamificationState,
  createHeroState,
  createQuestPickerState,
  type QuestSort,
} from "@/features/home/composables/useHomePageModels";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestAttemptSummary,
  QuestDaily,
} from "@/schemas/ipc";
import type { AchievementPulse } from "@/features/home/composables/useAchievementPulse";

export function useHomePageState() {
  const { t, locale } = useI18n();
  const { estimatedMinutesLabel, outputLabel, toError } = useHomePresentation(t);
  const { settings: uiSettings } = useUiPreferences();
  const state = computed(() => appState);
  const trainingProjectId = ref<string | null>(null);
  const trainingDailyQuest = ref<QuestDaily | null>(null);
  const selectedHeroQuest = ref<Quest | null>(null);
  const recentAttempts = ref<QuestAttemptSummary[]>([]);
  const trainingProgress = ref<ProgressSnapshot | null>(null);
  const mascotMessage = ref<MascotMessage | null>(null);
  const trainingError = ref<string | null>(null);
  const isTrainingLoading = ref(false);
  const isQuestPickerOpen = ref(false);
  const isQuestPickerLoading = ref(false);
  const questPickerError = ref<string | null>(null);
  const questPickerSearch = ref("");
  const questPickerCategory = ref("all");
  const questPickerSort = ref<QuestSort>("recent");
  const availableQuests = ref<Quest[]>([]);
  const achievementPulse = ref<AchievementPulse | null>(null);
  const { questCodeLabel, questRoute, closeQuestPicker, selectHeroQuest, resetHeroQuestToDaily } =
    useHomeQuestSelection({
      trainingProjectId,
      selectedHeroQuest,
      isQuestPickerOpen,
      activeProfileId: computed(() => state.value.activeProfileId),
      writeStoredHeroQuestCode,
      formatQuestCode: trainingStore.formatQuestCode,
    });
  const hero = createHeroState({ selectedHeroQuest, trainingDailyQuest, recentAttempts, questRoute });
  const picker = createQuestPickerState({
    availableQuests,
    questPickerSearch,
    questPickerCategory,
    questPickerSort,
    recentAttempts,
  });
  const gamification = createGamificationState({
    t,
    uiSettings,
    trainingProgress,
    availableQuests,
    trainingDailyQuest,
    mascotMessage,
    heroQuest: hero.heroQuest,
    questRoute,
    hasFeedbackInRecent: hero.hasFeedbackInRecent,
  });
  const { activeCode: questPickerActiveCode, onKeydown: onQuestPickerKeydown, syncActive: syncQuestPickerActive } =
    useQuestPickerNavigation({
      isOpen: isQuestPickerOpen,
      isLoading: isQuestPickerLoading,
      error: questPickerError,
      visibleItems: picker.pickerVisibleQuests,
      preferredCode: computed(() => hero.heroQuest.value?.code ?? null),
      onClose: closeQuestPicker,
      onSelect: selectHeroQuest,
    });
  const { focusQuestMapNode, loadTrainingData, openQuestPicker } = useHomeTrainingOrchestration({
    refs: {
      state,
      locale,
      showMascotCard: gamification.showMascotCard,
      questCategories: picker.questCategories,
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
    t,
    toError,
  });
  bindHomePageEffects({
    state,
    availableQuests,
    isQuestPickerOpen,
    questPickerSearch,
    questPickerCategory,
    questPickerSort,
    selectedHeroQuest,
    achievementPulse,
    mascotMessage,
    uiSettings,
    locale,
    showMascotCard: gamification.showMascotCard,
    trainingProjectId,
    pickerVisibleQuests: picker.pickerVisibleQuests,
    loadTrainingData,
    syncQuestPickerActive,
  });
  return {
    estimatedMinutesLabel, outputLabel,
    trainingProjectId, trainingDailyQuest, recentAttempts, trainingProgress,
    mascotMessage, trainingError, isTrainingLoading,
    isQuestPickerOpen, isQuestPickerLoading, questPickerError,
    questPickerSearch, questPickerCategory, questPickerSort, achievementPulse,
    feedbackAttempts: hero.feedbackAttempts,
    heroQuest: hero.heroQuest, heroQuestIsOverride: hero.heroQuestIsOverride, heroQuestRoute: hero.heroQuestRoute,
    questCategories: picker.questCategories, filteredQuests: picker.filteredQuests,
    recentPickerQuests: picker.recentPickerQuests, pickerMainQuests: picker.pickerMainQuests,
    showRecentQuestSection: picker.showRecentQuestSection,
    showMascotCard: gamification.showMascotCard, showCredits: gamification.showCredits,
    showQuestMap: gamification.showQuestMap, isQuestWorldMode: gamification.isQuestWorldMode,
    mascotBody: gamification.mascotBody,
    weeklyProgressPercent: gamification.weeklyProgressPercent, creditsToMilestone: gamification.creditsToMilestone,
    questMapNodes: gamification.questMapNodes, questMapHint: gamification.questMapHint,
    rewardBadges: gamification.rewardBadges, unlockedRewardCount: gamification.unlockedRewardCount,
    nextRewardBadge: gamification.nextRewardBadge, dailyLoopSteps: gamification.dailyLoopSteps,
    dailyLoopCompletedCount: gamification.dailyLoopCompletedCount,
    dailyLoopIsComplete: gamification.dailyLoopIsComplete,
    questCodeLabel, closeQuestPicker, selectHeroQuest, resetHeroQuestToDaily,
    questPickerActiveCode, onQuestPickerKeydown, focusQuestMapNode, openQuestPicker,
  };
}
