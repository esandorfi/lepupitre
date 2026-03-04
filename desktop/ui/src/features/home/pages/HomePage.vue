<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import AppBadge from "@/components/ui/AppBadge.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppPanel from "@/components/ui/AppPanel.vue";
import { useI18n } from "@/lib/i18n";
import {
  writeStoredHeroQuestCode,
} from "@/lib/trainingPreferences";
import { useUiPreferences } from "@/lib/uiPreferences";
import { appStore } from "@/stores/app";
import type { AchievementPulse } from "../composables/useAchievementPulse";
import {
  useHomePresentation,
  type DailyLoopStep,
  type QuestMapNode,
  type RewardBadge,
} from "../composables/useHomePresentation";
import { useHomeTrainingOrchestration } from "../composables/useHomeTrainingOrchestration";
import { useQuestPickerNavigation } from "../composables/useQuestPickerNavigation";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestAttemptSummary,
  QuestDaily,
} from "@/schemas/ipc";

const { t, locale } = useI18n();
const {
  attemptStatus,
  dailyLoopStepClass,
  estimatedMinutesLabel,
  formatDate,
  mascotToneClass,
  outputLabel,
  questMapConnectorClass,
  questMapNodeAriaLabel,
  questMapNodeClass,
  rewardBadgeClass,
  toError,
} = useHomePresentation(t);
const { settings: uiSettings } = useUiPreferences();
const state = computed(() => appStore.state);
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
const questPickerSort = ref<"recent" | "az" | "category">("recent");
const trainingActivityTab = ref<"feedback" | "history">("feedback");
const availableQuests = ref<Quest[]>([]);
const questPickerSearchEl = ref<HTMLInputElement | null>(null);
const questPickerListEl = ref<HTMLElement | null>(null);
const achievementPulse = ref<AchievementPulse | null>(null);

const feedbackAttempts = computed(() =>
  recentAttempts.value.filter((attempt) => Boolean(attempt.feedback_id))
);
const hasFeedbackInRecent = computed(() =>
  recentAttempts.value.some((attempt) => attempt.has_feedback)
);
const heroQuest = computed(() => selectedHeroQuest.value ?? trainingDailyQuest.value?.quest ?? null);
const heroQuestIsOverride = computed(() => Boolean(selectedHeroQuest.value));
const questCategories = computed(() => {
  const categories = Array.from(
    new Set(availableQuests.value.map((quest) => quest.category))
  ).sort();
  return ["all", ...categories];
});
const filteredQuests = computed(() => {
  const search = questPickerSearch.value.trim().toLowerCase();
  return availableQuests.value.filter((quest) => {
    if (
      questPickerCategory.value !== "all" &&
      quest.category !== questPickerCategory.value
    ) {
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
    return list.sort((a, b) =>
      a.category.localeCompare(b.category) ||
      a.title.localeCompare(b.title) ||
      a.code.localeCompare(b.code)
    );
  }
  return list.sort((a, b) =>
    a.title.localeCompare(b.title) || a.code.localeCompare(b.code)
  );
});
const showRecentQuestSection = computed(
  () => questPickerSort.value === "recent" && recentPickerQuests.value.length > 0
);
const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
const showCredits = computed(() => uiSettings.value.gamificationMode !== "minimal");
const showQuestMap = computed(() => uiSettings.value.gamificationMode !== "minimal");
const isQuestWorldMode = computed(() => uiSettings.value.gamificationMode === "quest-world");
const mascotBody = computed(() => {
  if (!mascotMessage.value) {
    return "";
  }
  if (uiSettings.value.mascotIntensity === "minimal") {
    return "";
  }
  return mascotMessage.value.body;
});
const weeklyProgressPercent = computed(() => {
  const progress = trainingProgress.value;
  if (!progress || progress.weekly_target <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((progress.weekly_completed / progress.weekly_target) * 100));
});
const creditsToMilestone = computed(() => {
  const progress = trainingProgress.value;
  if (!progress) {
    return 0;
  }
  return Math.max(0, progress.next_milestone - progress.credits);
});
const questCategoryPool = computed(() => {
  const categories = Array.from(
    new Set(
      availableQuests.value
        .map((quest) => quest.category.trim())
        .filter((category) => category.length > 0)
    )
  ).sort();
  const dailyCategory = trainingDailyQuest.value?.quest.category?.trim();
  if (!dailyCategory) {
    return categories;
  }
  const withoutDaily = categories.filter((category) => category !== dailyCategory);
  return [dailyCategory, ...withoutDaily];
});
const practicedToday = computed(() => {
  const value = trainingProgress.value?.last_attempt_at;
  if (!value) {
    return false;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const today = new Date();
  return parsed.toDateString() === today.toDateString();
});
const questMapNodes = computed<QuestMapNode[]>(() => {
  const progress = trainingProgress.value;
  if (!progress) {
    return [];
  }
  const checkpoints = Math.max(3, Math.min(7, progress.weekly_target));
  const completed = Math.min(progress.weekly_completed, checkpoints);
  return Array.from({ length: checkpoints }, (_, index) => {
    const order = index + 1;
    const isDone = order <= completed;
    const isCurrent = !isDone && order === completed + 1;
    const category =
      questCategoryPool.value.length > 0
        ? questCategoryPool.value[index % questCategoryPool.value.length]
        : null;
    return {
      id: `weekly-${order}`,
      label: `${t("training.quest_map_checkpoint")} ${order}`,
      reward: order === checkpoints ? 20 : 10,
      category,
      done: isDone,
      current: isCurrent,
      offsetPx: order % 2 === 0 ? 14 : 0,
    };
  });
});
const questMapHint = computed(() => {
  const progress = trainingProgress.value;
  if (!progress) {
    return t("training.quest_map_empty");
  }
  if (progress.weekly_completed >= progress.weekly_target) {
    return t("training.quest_map_hint_complete");
  }
  if (practicedToday.value) {
    return t("training.quest_map_hint_today");
  }
  if (progress.weekly_completed === 0) {
    return t("training.quest_map_hint_start");
  }
  return t("training.quest_map_hint_continue");
});
const rewardBadges = computed<RewardBadge[]>(() => {
  const progress = trainingProgress.value;
  if (!progress) {
    return [];
  }
  const weeklyTarget = Math.max(1, progress.weekly_target);
  return [
    {
      id: "streak-3",
      title: t("training.reward_streak_3"),
      unlocked: progress.streak_days >= 3,
      current: progress.streak_days,
      target: 3,
    },
    {
      id: "credits-100",
      title: t("training.reward_credits_100"),
      unlocked: progress.credits >= 100,
      current: progress.credits,
      target: 100,
    },
    {
      id: "weekly-target",
      title: `${t("training.reward_weekly_habit")} ${weeklyTarget}`,
      unlocked: progress.weekly_completed >= weeklyTarget,
      current: progress.weekly_completed,
      target: weeklyTarget,
    },
    {
      id: "streak-7",
      title: t("training.reward_streak_7"),
      unlocked: progress.streak_days >= 7,
      current: progress.streak_days,
      target: 7,
    },
  ];
});
const unlockedRewardCount = computed(
  () => rewardBadges.value.filter((badge) => badge.unlocked).length
);
const nextRewardBadge = computed(
  () => rewardBadges.value.find((badge) => !badge.unlocked) ?? null
);
const dailyLoopSteps = computed<DailyLoopStep[]>(() => {
  const practiceRoute = heroQuest.value ? questRoute(heroQuest.value.code) : "/training";
  return [
    {
      id: "practice",
      title: t("training.daily_loop_step_practice"),
      done: practicedToday.value,
      ctaRoute: practiceRoute,
    },
    {
      id: "feedback",
      title: t("training.daily_loop_step_feedback"),
      done: hasFeedbackInRecent.value,
      ctaRoute: "/feedback",
    },
    {
      id: "momentum",
      title: t("training.daily_loop_step_momentum"),
      done: (trainingProgress.value?.streak_days ?? 0) >= 3,
      ctaRoute: "/training",
    },
  ];
});
const dailyLoopCompletedCount = computed(
  () => dailyLoopSteps.value.filter((step) => step.done).length
);
const dailyLoopIsComplete = computed(
  () => dailyLoopCompletedCount.value >= dailyLoopSteps.value.length
);
const pickerVisibleQuests = computed(() => [
  ...recentPickerQuests.value,
  ...pickerMainQuests.value,
]);

const {
  activeCode: questPickerActiveCode,
  onKeydown: onQuestPickerKeydown,
  syncActive: syncQuestPickerActive,
} = useQuestPickerNavigation({
  isOpen: isQuestPickerOpen,
  isLoading: isQuestPickerLoading,
  error: questPickerError,
  visibleItems: pickerVisibleQuests,
  preferredCode: computed(() => heroQuest.value?.code ?? null),
  listElement: questPickerListEl,
  onClose: closeQuestPicker,
  onSelect: selectHeroQuest,
});

function questCodeLabel(code: string) {
  const projectId = trainingProjectId.value ?? "";
  return appStore.formatQuestCode(projectId, code);
}

function questRoute(code: string) {
  if (!trainingProjectId.value) {
    return "/training";
  }
  return `/quest/${code}?projectId=${trainingProjectId.value}&from=training`;
}

function isSelectedHeroQuest(code: string) {
  return heroQuest.value?.code === code;
}

function isQuestPickerActive(code: string) {
  return questPickerActiveCode.value === code;
}

function selectHeroQuest(quest: Quest) {
  selectedHeroQuest.value = quest;
  if (state.value.activeProfileId) {
    writeStoredHeroQuestCode(state.value.activeProfileId, quest.code);
  }
  closeQuestPicker();
}

function resetHeroQuestToDaily() {
  selectedHeroQuest.value = null;
  if (state.value.activeProfileId) {
    writeStoredHeroQuestCode(state.value.activeProfileId, null);
  }
}

function closeQuestPicker() {
  isQuestPickerOpen.value = false;
}

const {
  focusQuestMapNode,
  loadTrainingData,
  openQuestPicker,
} = useHomeTrainingOrchestration({
  refs: {
    state,
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
    questPickerSearchEl,
    achievementPulse,
  },
  t,
  toError,
});

onMounted(async () => {
  await appStore.bootstrap();
  await loadTrainingData();
});

watch(
  () => state.value.activeProfileId,
  async () => {
    availableQuests.value = [];
    isQuestPickerOpen.value = false;
    questPickerSearch.value = "";
    questPickerCategory.value = "all";
    questPickerSort.value = "recent";
    trainingActivityTab.value = "feedback";
    selectedHeroQuest.value = null;
    achievementPulse.value = null;
    await loadTrainingData();
  }
);

watch(
  [isQuestPickerOpen, pickerVisibleQuests],
  () => {
    syncQuestPickerActive();
  },
  { deep: false }
);

watch(
  () => locale.value,
  async () => {
    if (!showMascotCard.value || !trainingProjectId.value || !state.value.activeProfileId) {
      return;
    }
    try {
      mascotMessage.value = await appStore.getMascotContextMessage({
        routeName: "training",
        projectId: trainingProjectId.value,
        locale: locale.value,
      });
    } catch {
      // non-blocking assistant copy
    }
  }
);

watch(
  () => [uiSettings.value.mascotEnabled, uiSettings.value.mascotIntensity, uiSettings.value.gamificationMode] as const,
  async ([mascotEnabled]) => {
    if (!mascotEnabled) {
      mascotMessage.value = null;
      return;
    }
    if (!trainingProjectId.value || !state.value.activeProfileId) {
      return;
    }
    try {
      mascotMessage.value = await appStore.getMascotContextMessage({
        routeName: "training",
        projectId: trainingProjectId.value,
        locale: locale.value,
      });
    } catch {
      // non-blocking assistant copy
    }
  }
);
</script>

<template>
  <section class="app-page-shell">
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)] xl:items-start">
      <div class="space-y-4">
        <AppPanel variant="hero">
          <div class="app-text-eyebrow">{{ t("training.hero_label") }}</div>
          <div v-if="trainingError" class="app-danger-text app-text-meta mt-2">{{ trainingError }}</div>
          <div v-else-if="isTrainingLoading" class="app-muted app-text-body mt-2">{{ t("talks.loading") }}</div>
          <div v-else-if="heroQuest" class="mt-2 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <AppBadge tone="neutral">
                {{ heroQuestIsOverride ? t("training.hero_selected_badge") : t("training.hero_daily_badge") }}
              </AppBadge>
              <AppButton
                v-if="heroQuestIsOverride && trainingDailyQuest"
                class="app-link app-text-meta underline !px-0 !py-0 !font-normal"
                size="sm"
                tone="ghost"
                @click="resetHeroQuestToDaily"
              >
                {{ t("training.use_daily_quest") }}
              </AppButton>
            </div>
            <div class="app-text app-text-page-title">{{ heroQuest.title }}</div>
            <div class="app-muted app-text-body">{{ heroQuest.prompt }}</div>
            <div class="flex flex-wrap items-center gap-2 app-text-meta">
              <AppBadge tone="neutral">
                {{ outputLabel(heroQuest.output_type) }}
              </AppBadge>
              <AppBadge tone="neutral">
                {{ heroQuest.category }}
              </AppBadge>
              <AppBadge tone="neutral">
                {{ estimatedMinutesLabel(heroQuest.estimated_sec) }} {{ t("talks.minutes") }}
              </AppBadge>
            </div>
            <div class="pt-1">
              <AppButton size="lg" tone="primary" :to="questRoute(heroQuest.code)">
                {{ t("training.start") }}
              </AppButton>
            </div>
          </div>
          <div v-else class="app-muted app-text-body mt-2">
            {{ t("home.quest_empty") }}
          </div>
        </AppPanel>

        <AppPanel
          v-if="achievementPulse && !trainingError"
          class="border border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))]"
          variant="compact"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="app-text-eyebrow">{{ t("training.achievement_title") }}</div>
              <div class="app-text app-text-subheadline mt-1">{{ achievementPulse.title }}</div>
              <div class="app-muted app-text-body mt-1">{{ achievementPulse.body }}</div>
            </div>
            <div class="flex items-center gap-2">
              <AppButton size="sm" tone="secondary" :to="achievementPulse.ctaRoute">
                {{ achievementPulse.ctaLabel }}
              </AppButton>
              <AppButton size="sm" tone="ghost" @click="achievementPulse = null">
                {{ t("training.achievement_dismiss") }}
              </AppButton>
            </div>
          </div>
        </AppPanel>

        <AppPanel
          v-if="showMascotCard && mascotMessage && !trainingError"
          class="border"
          :class="mascotToneClass(mascotMessage.kind)"
          variant="compact"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="app-text-eyebrow">{{ t("training.mascot_label") }}</div>
              <div class="app-text app-text-subheadline mt-1">{{ mascotMessage.title }}</div>
              <div v-if="mascotBody" class="app-muted app-text-body mt-1">{{ mascotBody }}</div>
            </div>
            <AppButton
              v-if="mascotMessage.cta_route && mascotMessage.cta_label"
              size="md"
              tone="secondary"
              :to="mascotMessage.cta_route"
            >
              {{ mascotMessage.cta_label }}
            </AppButton>
          </div>
        </AppPanel>

        <AppPanel
          v-if="trainingProgress"
          class="border"
          :class="dailyLoopIsComplete ? 'border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-surface))]' : ''"
          variant="compact"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="app-text-eyebrow">{{ t("training.daily_loop_title") }}</div>
              <div class="app-muted app-text-meta mt-1">{{ t("training.daily_loop_subtitle") }}</div>
            </div>
            <AppBadge tone="neutral">
              {{ dailyLoopCompletedCount }} / {{ dailyLoopSteps.length }}
            </AppBadge>
          </div>
          <div class="mt-3 space-y-2">
            <div
              v-for="step in dailyLoopSteps"
              :key="step.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              :class="dailyLoopStepClass(step.done)"
            >
              <div class="app-text app-text-body-strong text-sm">{{ step.title }}</div>
              <div class="flex items-center gap-2">
                <AppBadge :tone="step.done ? 'success' : 'neutral'" class="py-0.5">
                  {{ step.done ? t("training.daily_loop_done") : t("training.daily_loop_pending") }}
                </AppBadge>
                <RouterLink
                  v-if="!step.done"
                  class="app-link app-text-meta underline"
                  :to="step.ctaRoute"
                >
                  {{ t("training.daily_loop_open") }}
                </RouterLink>
              </div>
            </div>
          </div>
          <div class="app-muted app-text-meta mt-2">
            {{ dailyLoopIsComplete ? t("training.daily_loop_hint_complete") : t("training.daily_loop_hint_pending") }}
          </div>
        </AppPanel>

        <AppPanel>
          <div class="app-text-eyebrow">{{ t("training.alternate_title") }}</div>
          <p class="app-muted app-text-body mt-2">{{ t("training.alternate_subtitle") }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <AppButton
              v-if="trainingProjectId"
              size="lg"
              tone="secondary"
              :to="`/quest/FREE?projectId=${trainingProjectId}&from=training`"
            >
              {{ t("training.free_quest") }}
            </AppButton>
            <AppButton
              v-if="trainingProjectId"
              size="lg"
              tone="secondary"
              @click="openQuestPicker"
            >
              {{ t("training.change_quest") }}
            </AppButton>
            <RouterLink
              class="app-link app-text-meta inline-flex items-center underline"
              to="/talks"
            >
              {{ t("training.go_talks") }}
            </RouterLink>
          </div>

          <div
            v-if="isQuestPickerOpen"
            class="mt-4 rounded-xl border border-[var(--app-border)] p-3"
            @keydown="onQuestPickerKeydown"
          >
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="app-text app-text-section-title">{{ t("training.quest_picker_title") }}</div>
              <AppButton size="md" tone="ghost" @click="closeQuestPicker">
                {{ t("training.close_picker") }}
              </AppButton>
            </div>

            <div class="space-y-3">
              <UInput
                ref="questPickerSearchEl"
                v-model="questPickerSearch"
                class="w-full"
                :placeholder="t('training.quest_search_placeholder')"
              />

              <div class="flex flex-wrap gap-2">
                <AppButton
                  v-for="category in questCategories"
                  :key="category"
                  size="sm"
                  :tone="questPickerCategory === category ? 'secondary' : 'ghost'"
                  @click="questPickerCategory = category"
                >
                  {{ category === "all" ? t("training.quest_category_all") : category }}
                </AppButton>
              </div>

              <div class="flex flex-wrap gap-2">
                <AppButton
                  size="sm"
                  :tone="questPickerSort === 'recent' ? 'secondary' : 'ghost'"
                  @click="questPickerSort = 'recent'"
                >
                  {{ t("training.quest_sort_recent") }}
                </AppButton>
                <AppButton
                  size="sm"
                  :tone="questPickerSort === 'az' ? 'secondary' : 'ghost'"
                  @click="questPickerSort = 'az'"
                >
                  {{ t("training.quest_sort_az") }}
                </AppButton>
                <AppButton
                  size="sm"
                  :tone="questPickerSort === 'category' ? 'secondary' : 'ghost'"
                  @click="questPickerSort = 'category'"
                >
                  {{ t("training.quest_sort_category") }}
                </AppButton>
              </div>

          <div v-if="isQuestPickerLoading" class="app-muted app-text-body">{{ t("talks.loading") }}</div>
          <div v-else-if="questPickerError" class="app-danger-text app-text-meta">{{ questPickerError }}</div>
          <div v-else-if="filteredQuests.length === 0" class="app-muted app-text-body">
            {{ t("training.quest_picker_empty") }}
          </div>
          <div v-else ref="questPickerListEl" class="max-h-72 space-y-3 overflow-y-auto pr-1">
            <div v-if="showRecentQuestSection" class="space-y-2">
              <p class="app-text-eyebrow">
                {{ t("training.quest_recent_title") }}
              </p>
              <div
                v-for="quest in recentPickerQuests"
                :key="`recent-${quest.code}`"
                class="block w-full cursor-pointer rounded-xl border px-3 py-2 text-left transition"
                :class="
                  [
                    isSelectedHeroQuest(quest.code)
                      ? 'border-[var(--color-accent)] bg-[var(--color-surface-selected)]'
                      : 'border-[var(--app-border)] hover:bg-[var(--color-surface-elevated)]',
                    isQuestPickerActive(quest.code) ? 'outline outline-1 outline-[var(--color-accent)]' : '',
                  ]
                "
                :data-quest-code="quest.code"
                :aria-selected="isQuestPickerActive(quest.code)"
                @click="selectHeroQuest(quest)"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="app-text text-sm font-semibold">{{ quest.title }}</div>
                    <div class="app-muted mt-1 line-clamp-2 text-xs">{{ quest.prompt }}</div>
                    <div class="mt-2 flex flex-wrap items-center gap-2 app-text-caption">
                      <AppBadge tone="neutral">
                        {{ questCodeLabel(quest.code) }}
                      </AppBadge>
                      <AppBadge tone="neutral">
                        {{ outputLabel(quest.output_type) }}
                      </AppBadge>
                      <AppBadge tone="neutral">
                        {{ estimatedMinutesLabel(quest.estimated_sec) }} {{ t("talks.minutes") }}
                      </AppBadge>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <RouterLink
                      data-quest-row-action
                      class="app-link app-text-meta underline"
                      :to="questRoute(quest.code)"
                      @click.stop="closeQuestPicker"
                    >
                      {{ t("training.quest_start_now") }}
                    </RouterLink>
                    <AppBadge
                      v-if="isSelectedHeroQuest(quest.code)"
                      tone="success"
                    >
                      {{ t("training.quest_selected") }}
                    </AppBadge>
                    <span class="app-subtle app-text-meta font-semibold">{{ quest.category }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="pickerMainQuests.length > 0" class="space-y-2">
              <p
                v-if="showRecentQuestSection"
                class="app-text-eyebrow"
              >
                {{ t("training.quest_all_title") }}
              </p>
            <div
              v-for="quest in pickerMainQuests"
              :key="quest.code"
              class="block w-full cursor-pointer rounded-xl border px-3 py-2 text-left transition"
              :class="
                [
                  isSelectedHeroQuest(quest.code)
                    ? 'border-[var(--color-accent)] bg-[var(--color-surface-selected)]'
                    : 'border-[var(--app-border)] hover:bg-[var(--color-surface-elevated)]',
                  isQuestPickerActive(quest.code) ? 'outline outline-1 outline-[var(--color-accent)]' : '',
                ]
              "
              :data-quest-code="quest.code"
              :aria-selected="isQuestPickerActive(quest.code)"
              @click="selectHeroQuest(quest)"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="app-text text-sm font-semibold">{{ quest.title }}</div>
                  <div class="app-muted mt-1 line-clamp-2 text-xs">{{ quest.prompt }}</div>
                  <div class="mt-2 flex flex-wrap items-center gap-2 app-text-caption">
                    <AppBadge tone="neutral">
                      {{ questCodeLabel(quest.code) }}
                    </AppBadge>
                    <AppBadge tone="neutral">
                      {{ outputLabel(quest.output_type) }}
                    </AppBadge>
                    <AppBadge tone="neutral">
                      {{ estimatedMinutesLabel(quest.estimated_sec) }} {{ t("talks.minutes") }}
                    </AppBadge>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <RouterLink
                    data-quest-row-action
                    class="app-link app-text-meta underline"
                    :to="questRoute(quest.code)"
                    @click.stop="closeQuestPicker"
                  >
                    {{ t("training.quest_start_now") }}
                  </RouterLink>
                  <AppBadge
                    v-if="isSelectedHeroQuest(quest.code)"
                    tone="success"
                  >
                    {{ t("training.quest_selected") }}
                  </AppBadge>
                  <span class="app-subtle app-text-meta font-semibold">{{ quest.category }}</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
          </div>
        </AppPanel>
      </div>

      <AppPanel class="xl:sticky xl:top-4">
      <div
        class="rounded-xl border border-[var(--app-border)] p-3"
        :class="isQuestWorldMode ? 'bg-[color-mix(in_srgb,var(--color-accent-soft)_30%,var(--color-surface))]' : ''"
      >
        <div class="app-text-eyebrow">{{ t("training.progress_title") }}</div>
        <div v-if="isTrainingLoading" class="app-muted app-text-meta mt-2">{{ t("talks.loading") }}</div>
        <div v-else-if="trainingProgress" class="mt-2 space-y-2">
          <div class="grid gap-2" :class="showCredits ? 'sm:grid-cols-2' : 'sm:grid-cols-1'">
            <div class="rounded-lg border border-[var(--app-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
              <div class="app-muted app-text-caption">{{ t("training.progress_streak") }}</div>
              <div class="app-text app-text-section-title mt-1">
                {{ trainingProgress.streak_days }}
              </div>
            </div>
            <div
              v-if="showCredits"
              class="rounded-lg border border-[var(--app-border)] bg-[var(--color-surface-elevated)] px-3 py-2"
            >
              <div class="app-muted app-text-caption">{{ t("training.progress_credits") }}</div>
              <div class="app-text app-text-section-title mt-1">
                {{ trainingProgress.credits }}
              </div>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between gap-2 app-text-meta">
              <span class="app-muted">{{ t("training.progress_weekly") }}</span>
              <span class="app-text">
                {{ trainingProgress.weekly_completed }} / {{ trainingProgress.weekly_target }}
              </span>
            </div>
            <div class="mt-1 h-2 overflow-hidden rounded-full app-meter-bg">
              <div
                class="h-full rounded-full bg-[var(--color-accent)] transition-all"
                :style="{ width: `${weeklyProgressPercent}%` }"
              ></div>
            </div>
          </div>
          <div v-if="showCredits" class="app-muted app-text-meta">
            {{ t("training.progress_next") }}: {{ trainingProgress.next_milestone }}
            ({{ creditsToMilestone }} {{ t("training.progress_to_next") }})
          </div>

          <div
            v-if="showQuestMap && questMapNodes.length > 0"
            class="rounded-xl border border-[var(--app-border)] p-3"
            :class="isQuestWorldMode ? 'bg-[color-mix(in_srgb,var(--color-accent-soft)_20%,var(--color-surface))]' : 'bg-[var(--color-surface-elevated)]'"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="app-text-eyebrow">{{ t("training.quest_map_title") }}</div>
              <AppBadge tone="neutral">
                {{ trainingProgress.weekly_completed }} / {{ trainingProgress.weekly_target }}
              </AppBadge>
            </div>
            <div class="mt-3 overflow-x-auto pb-1">
              <div class="flex min-w-[440px] items-start gap-2 pr-1">
                <template v-for="(node, index) in questMapNodes" :key="node.id">
                  <div class="flex items-start gap-2">
                    <AppButton
                      class="min-h-0 w-[76px] flex-col items-center text-center transition !px-0 !py-0"
                      :style="{ marginTop: `${node.offsetPx}px` }"
                      size="sm"
                      tone="ghost"
                      :aria-label="questMapNodeAriaLabel(node)"
                      @click="focusQuestMapNode(node)"
                    >
                      <div
                        class="flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition"
                        :class="questMapNodeClass(node)"
                      >
                        {{ index + 1 }}
                      </div>
                      <div class="app-text app-text-caption mt-1 leading-tight">
                        {{ node.label }}
                      </div>
                      <div class="app-muted app-text-meta mt-1">
                        +{{ node.reward }} {{ t("training.progress_credits") }}
                      </div>
                      <AppBadge class="mt-1 py-0.5" tone="neutral">
                        {{ node.category ?? t("training.quest_map_any_category") }}
                      </AppBadge>
                    </AppButton>
                    <div
                      v-if="index < questMapNodes.length - 1"
                      class="mt-4 h-[2px] w-8 rounded-full transition"
                      :class="questMapConnectorClass(node.done)"
                    ></div>
                  </div>
                </template>
              </div>
            </div>
            <div class="app-muted app-text-meta mt-2">
              {{ questMapHint }}
            </div>
          </div>

          <div
            v-if="showCredits && rewardBadges.length > 0"
            class="rounded-xl border border-[var(--app-border)] bg-[var(--color-surface-elevated)] p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="app-text-eyebrow">{{ t("training.rewards_title") }}</div>
              <AppBadge tone="neutral">
                {{ unlockedRewardCount }} / {{ rewardBadges.length }} {{ t("training.rewards_unlocked") }}
              </AppBadge>
            </div>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <div
                v-for="badge in rewardBadges"
                :key="badge.id"
                class="rounded-lg border px-3 py-2"
                :class="rewardBadgeClass(badge.unlocked, nextRewardBadge?.id === badge.id)"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="app-text app-text-body-strong text-sm">{{ badge.title }}</div>
                  <AppBadge
                    class="py-0.5"
                    :tone="badge.unlocked ? 'success' : 'neutral'"
                  >
                    {{ badge.unlocked ? t("training.rewards_status_unlocked") : t("training.rewards_status_locked") }}
                  </AppBadge>
                </div>
                <div class="app-muted app-text-meta mt-1">
                  {{ Math.min(badge.current, badge.target) }} / {{ badge.target }}
                </div>
              </div>
            </div>
            <div v-if="nextRewardBadge" class="app-muted app-text-meta mt-2">
              {{ t("training.rewards_next") }}: {{ nextRewardBadge.title }}
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="app-text-eyebrow">
          {{ t("training.history_title") }}
        </div>
        <div class="flex flex-wrap gap-2">
          <AppButton
            size="sm"
            :tone="trainingActivityTab === 'feedback' ? 'secondary' : 'ghost'"
            @click="trainingActivityTab = 'feedback'"
          >
            {{ t("training.feedback_title") }} · {{ feedbackAttempts.length }}
          </AppButton>
          <AppButton
            size="sm"
            :tone="trainingActivityTab === 'history' ? 'secondary' : 'ghost'"
            @click="trainingActivityTab = 'history'"
          >
            {{ t("training.history_title") }} · {{ recentAttempts.length }}
          </AppButton>
        </div>
      </div>

      <div v-if="isTrainingLoading" class="app-muted app-text-body mt-3">{{ t("talks.loading") }}</div>

      <template v-else-if="trainingActivityTab === 'feedback'">
        <div v-if="feedbackAttempts.length === 0" class="app-muted app-text-body mt-3">
          {{ t("training.feedback_empty") }}
        </div>
        <div v-else class="mt-3 space-y-3">
          <div class="space-y-2 app-text-meta">
            <div
              v-for="attempt in feedbackAttempts"
              :key="attempt.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
            >
              <div>
                <div class="app-text text-sm">{{ attempt.quest_title }}</div>
                <div class="app-muted app-text-meta">
                  {{ formatDate(attempt.created_at) }} · {{ outputLabel(attempt.output_type) }} ·
                  {{ questCodeLabel(attempt.quest_code) }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <AppBadge tone="success">
                  {{ t("training.feedback_ready") }}
                </AppBadge>
                <RouterLink
                  v-if="attempt.feedback_id"
                  class="app-link app-text-meta underline"
                  :to="`/feedback/${attempt.feedback_id}`"
                >
                  {{ t("home.quest_followup_feedback") }}
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="recentAttempts.length === 0" class="app-muted app-text-body mt-3">
          {{ t("training.history_empty") }}
        </div>
        <div v-else class="mt-3 space-y-2 app-text-meta">
          <div
            v-for="attempt in recentAttempts"
            :key="attempt.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
          >
            <div>
              <div class="app-text text-sm">{{ attempt.quest_title }}</div>
              <div class="app-muted app-text-meta">
                {{ formatDate(attempt.created_at) }} · {{ attemptStatus(attempt) }} ·
                {{ questCodeLabel(attempt.quest_code) }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <RouterLink
                class="app-link app-text-meta underline"
                :to="`/quest/${attempt.quest_code}?projectId=${trainingProjectId}&from=training`"
              >
                {{ t("home.quest_followup_replay") }}
              </RouterLink>
              <RouterLink
                v-if="attempt.feedback_id"
                class="app-link app-text-meta underline"
                :to="`/feedback/${attempt.feedback_id}`"
              >
                {{ t("home.quest_followup_feedback") }}
              </RouterLink>
            </div>
          </div>
        </div>
      </template>
      </AppPanel>
    </div>
  </section>
</template>

