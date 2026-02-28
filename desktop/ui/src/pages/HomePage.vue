<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "../lib/i18n";
import { useUiPreferences } from "../lib/uiPreferences";
import { appStore } from "../stores/app";
import type {
  MascotMessage,
  ProgressSnapshot,
  Quest,
  QuestAttemptSummary,
  QuestDaily,
} from "../schemas/ipc";

type QuestMapNode = {
  id: string;
  label: string;
  reward: number;
  category: string | null;
  done: boolean;
  current: boolean;
  offsetPx: number;
};

const { t, locale } = useI18n();
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
const questPickerActiveCode = ref<string | null>(null);

const feedbackAttempts = computed(() =>
  recentAttempts.value.filter((attempt) => Boolean(attempt.feedback_id))
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
const pickerVisibleQuests = computed(() => [
  ...recentPickerQuests.value,
  ...pickerMainQuests.value,
]);

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

function estimatedMinutesLabel(seconds: number) {
  return Math.max(1, Math.round(seconds / 60));
}

function attemptStatus(attempt: QuestAttemptSummary) {
  if (attempt.has_feedback) {
    return t("quest.status_feedback");
  }
  if (attempt.has_transcript) {
    return t("quest.status_transcribed");
  }
  if (attempt.has_audio) {
    return t("quest.status_recorded");
  }
  return t("quest.status_submitted");
}

function questCodeLabel(code: string) {
  const projectId = trainingProjectId.value ?? "";
  return appStore.formatQuestCode(projectId, code);
}

function outputLabel(outputType: string) {
  return outputType.toLowerCase() === "audio"
    ? t("quest.output_audio")
    : t("quest.output_text");
}

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function mascotToneClass(kind: string | null | undefined) {
  if (kind === "celebrate") {
    return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_15%,var(--color-surface))]";
  }
  if (kind === "nudge") {
    return "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))]";
  }
  return "border-[var(--color-border)] bg-[var(--color-surface-elevated)]";
}

function questMapNodeClass(node: QuestMapNode) {
  if (node.done) {
    return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_22%,var(--color-surface))] text-[var(--color-success)]";
  }
  if (node.current) {
    return "border-[var(--color-accent)] bg-[var(--color-surface-selected)] text-[var(--color-accent)]";
  }
  return "border-[var(--app-border)] bg-[var(--color-surface-elevated)] text-[var(--color-muted)]";
}

function questMapConnectorClass(done: boolean) {
  return done
    ? "bg-[var(--color-success)]"
    : "bg-[color-mix(in_srgb,var(--app-border)_70%,transparent)]";
}

function questMapNodeAriaLabel(node: QuestMapNode) {
  const category = node.category ?? t("training.quest_map_any_category");
  return `${node.label} (${category})`;
}

function trainingHeroQuestStorageKey(profileId: string) {
  return `lepupitre.training.heroQuest.${profileId}`;
}

function readStoredHeroQuestCode(profileId: string): string | null {
  try {
    const value = window.localStorage.getItem(trainingHeroQuestStorageKey(profileId));
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

function writeStoredHeroQuestCode(profileId: string, questCode: string | null) {
  try {
    const key = trainingHeroQuestStorageKey(profileId);
    if (!questCode) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, questCode);
  } catch {
    // local-only preference; ignore storage failures
  }
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

async function loadTrainingData() {
  if (!state.value.activeProfileId) {
    trainingProjectId.value = null;
    trainingDailyQuest.value = null;
    selectedHeroQuest.value = null;
    recentAttempts.value = [];
    trainingProgress.value = null;
    mascotMessage.value = null;
    return;
  }
  isTrainingLoading.value = true;
  trainingError.value = null;
  try {
    const projectId = await appStore.ensureTrainingProject();
    trainingProjectId.value = projectId;
    trainingDailyQuest.value = await appStore.getDailyQuestForProject(projectId);
    if (
      selectedHeroQuest.value &&
      selectedHeroQuest.value.code === trainingDailyQuest.value.quest.code
    ) {
      selectedHeroQuest.value = null;
    }
    const activeProfileId = state.value.activeProfileId;
    if (activeProfileId) {
      const storedQuestCode = readStoredHeroQuestCode(activeProfileId);
      if (storedQuestCode && storedQuestCode !== trainingDailyQuest.value.quest.code) {
        if (selectedHeroQuest.value?.code !== storedQuestCode) {
          try {
            selectedHeroQuest.value = await appStore.getQuestByCode(storedQuestCode);
          } catch {
            writeStoredHeroQuestCode(activeProfileId, null);
            selectedHeroQuest.value = null;
          }
        }
      } else if (storedQuestCode === trainingDailyQuest.value.quest.code) {
        writeStoredHeroQuestCode(activeProfileId, null);
      }
    }
    const [attempts, progress, mascot] = await Promise.all([
      appStore.getQuestAttempts(projectId, 6),
      appStore.getProgressSnapshot(projectId),
      showMascotCard.value
        ? appStore.getMascotContextMessage({
            routeName: "training",
            projectId,
            locale: locale.value,
          })
        : Promise.resolve(null),
    ]);
    recentAttempts.value = attempts;
    trainingProgress.value = progress;
    mascotMessage.value = mascot;
    void preloadQuestCatalog();
  } catch (err) {
    trainingError.value = toError(err);
    trainingDailyQuest.value = null;
    recentAttempts.value = [];
    trainingProgress.value = null;
    mascotMessage.value = null;
  } finally {
    isTrainingLoading.value = false;
  }
}

async function preloadQuestCatalog() {
  if (!state.value.activeProfileId) {
    return;
  }
  if (availableQuests.value.length > 0 || isQuestPickerLoading.value) {
    return;
  }
  try {
    availableQuests.value = await appStore.getQuestList();
  } catch {
    // non-blocking; quest picker still loads on demand
  }
}

async function openQuestPicker() {
  isQuestPickerOpen.value = true;
  await nextTick();
  questPickerSearchEl.value?.focus();
  if (availableQuests.value.length > 0 || isQuestPickerLoading.value) {
    return;
  }
  isQuestPickerLoading.value = true;
  questPickerError.value = null;
  try {
    availableQuests.value = await appStore.getQuestList();
  } catch (err) {
    questPickerError.value = toError(err);
  } finally {
    isQuestPickerLoading.value = false;
  }
}

async function focusQuestMapNode(node: QuestMapNode) {
  await openQuestPicker();
  if (!isQuestPickerOpen.value) {
    return;
  }
  if (node.category && questCategories.value.includes(node.category)) {
    questPickerCategory.value = node.category;
  } else {
    questPickerCategory.value = "all";
  }
  questPickerSort.value = "category";
  questPickerSearch.value = "";
}

function closeQuestPicker() {
  isQuestPickerOpen.value = false;
}

function syncQuestPickerActive() {
  if (!isQuestPickerOpen.value) {
    questPickerActiveCode.value = null;
    return;
  }
  const visible = pickerVisibleQuests.value;
  if (visible.length === 0) {
    questPickerActiveCode.value = null;
    return;
  }
  if (questPickerActiveCode.value && visible.some((quest) => quest.code === questPickerActiveCode.value)) {
    return;
  }
  const preferredCode = heroQuest.value?.code;
  const preferred = preferredCode
    ? visible.find((quest) => quest.code === preferredCode)
    : null;
  questPickerActiveCode.value = preferred?.code ?? visible[0]?.code ?? null;
  scrollQuestPickerActiveIntoView();
}

function moveQuestPickerActive(delta: 1 | -1) {
  const visible = pickerVisibleQuests.value;
  if (visible.length === 0) {
    return;
  }
  const currentIndex = questPickerActiveCode.value
    ? visible.findIndex((quest) => quest.code === questPickerActiveCode.value)
    : -1;
  const nextIndex =
    currentIndex < 0
      ? 0
      : (currentIndex + delta + visible.length) % visible.length;
  questPickerActiveCode.value = visible[nextIndex]?.code ?? null;
  scrollQuestPickerActiveIntoView();
}

function activateQuestPickerActive() {
  const code = questPickerActiveCode.value;
  if (!code) {
    return;
  }
  const quest = pickerVisibleQuests.value.find((item) => item.code === code);
  if (quest) {
    selectHeroQuest(quest);
  }
}

function scrollQuestPickerActiveIntoView() {
  void nextTick(() => {
    const code = questPickerActiveCode.value;
    const listEl = questPickerListEl.value;
    if (!code || !listEl) {
      return;
    }
    const rows = Array.from(listEl.querySelectorAll<HTMLElement>("[data-quest-code]"));
    const activeEl = rows.find((row) => row.dataset.questCode === code);
    activeEl?.scrollIntoView({ block: "nearest" });
  });
}

function onQuestPickerKeydown(event: KeyboardEvent) {
  if (!isQuestPickerOpen.value) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeQuestPicker();
    return;
  }
  if (isQuestPickerLoading.value || Boolean(questPickerError.value) || pickerVisibleQuests.value.length === 0) {
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveQuestPickerActive(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveQuestPickerActive(-1);
    return;
  }
  if (event.key === "Enter") {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-quest-row-action]")) {
      return;
    }
    event.preventDefault();
    activateQuestPickerActive();
  }
}

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
    <div class="app-panel app-panel-hero">
      <div class="app-text-eyebrow">{{ t("training.hero_label") }}</div>
      <div v-if="trainingError" class="app-danger-text app-text-meta mt-2">{{ trainingError }}</div>
      <div v-else-if="isTrainingLoading" class="app-muted app-text-body mt-2">{{ t("talks.loading") }}</div>
      <div v-else-if="heroQuest" class="mt-2 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="app-badge-neutral app-text-caption rounded-full px-2 py-1 font-semibold">
            {{ heroQuestIsOverride ? t("training.hero_selected_badge") : t("training.hero_daily_badge") }}
          </span>
          <button
            v-if="heroQuestIsOverride && trainingDailyQuest"
            class="app-link app-text-meta underline"
            type="button"
            @click="resetHeroQuestToDaily"
          >
            {{ t("training.use_daily_quest") }}
          </button>
        </div>
        <div class="app-text app-text-page-title">{{ heroQuest.title }}</div>
        <div class="app-muted app-text-body">{{ heroQuest.prompt }}</div>
        <div class="flex flex-wrap items-center gap-2 app-text-meta">
          <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
            {{ outputLabel(heroQuest.output_type) }}
          </span>
          <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
            {{ heroQuest.category }}
          </span>
          <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
            {{ estimatedMinutesLabel(heroQuest.estimated_sec) }} {{ t("talks.minutes") }}
          </span>
        </div>
        <div class="pt-1">
          <RouterLink
            class="app-button-primary app-focus-ring app-button-lg inline-flex items-center"
            :to="questRoute(heroQuest.code)"
          >
            {{ t("training.start") }}
          </RouterLink>
        </div>
      </div>
      <div v-else class="app-muted app-text-body mt-2">
        {{ t("home.quest_empty") }}
      </div>
    </div>

    <div
      v-if="showMascotCard && mascotMessage && !trainingError"
      class="app-panel app-panel-compact border"
      :class="mascotToneClass(mascotMessage.kind)"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="app-text-eyebrow">{{ t("training.mascot_label") }}</div>
          <div class="app-text app-text-subheadline mt-1">{{ mascotMessage.title }}</div>
          <div v-if="mascotBody" class="app-muted app-text-body mt-1">{{ mascotBody }}</div>
        </div>
        <RouterLink
          v-if="mascotMessage.cta_route && mascotMessage.cta_label"
          class="app-button-secondary app-focus-ring app-button-md inline-flex items-center"
          :to="mascotMessage.cta_route"
        >
          {{ mascotMessage.cta_label }}
        </RouterLink>
      </div>
    </div>

    <div class="app-panel">
      <div class="app-text-eyebrow">{{ t("training.alternate_title") }}</div>
      <p class="app-muted app-text-body mt-2">{{ t("training.alternate_subtitle") }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <RouterLink
          v-if="trainingProjectId"
          class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center"
          :to="`/quest/FREE?projectId=${trainingProjectId}&from=training`"
        >
          {{ t("training.free_quest") }}
        </RouterLink>
        <button
          v-if="trainingProjectId"
          class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center"
          type="button"
          @click="openQuestPicker"
        >
          {{ t("training.change_quest") }}
        </button>
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
          <button
            class="app-button-ghost app-focus-ring app-button-md inline-flex items-center"
            type="button"
            @click="closeQuestPicker"
          >
            {{ t("training.close_picker") }}
          </button>
        </div>

        <div class="space-y-3">
          <input
            ref="questPickerSearchEl"
            v-model="questPickerSearch"
            class="app-input app-focus-ring app-control-md app-radius-control w-full border px-3 app-text-body"
            type="text"
            :placeholder="t('training.quest_search_placeholder')"
          />

          <div class="flex flex-wrap gap-2">
            <button
              v-for="category in questCategories"
              :key="category"
              class="app-focus-ring app-button-sm inline-flex items-center transition"
              :class="questPickerCategory === category ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="questPickerCategory = category"
            >
              {{ category === "all" ? t("training.quest_category_all") : category }}
            </button>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              class="app-focus-ring app-button-sm inline-flex items-center transition"
              :class="questPickerSort === 'recent' ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="questPickerSort = 'recent'"
            >
              {{ t("training.quest_sort_recent") }}
            </button>
            <button
              class="app-focus-ring app-button-sm inline-flex items-center transition"
              :class="questPickerSort === 'az' ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="questPickerSort = 'az'"
            >
              {{ t("training.quest_sort_az") }}
            </button>
            <button
              class="app-focus-ring app-button-sm inline-flex items-center transition"
              :class="questPickerSort === 'category' ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="questPickerSort = 'category'"
            >
              {{ t("training.quest_sort_category") }}
            </button>
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
                      <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
                        {{ questCodeLabel(quest.code) }}
                      </span>
                      <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
                        {{ outputLabel(quest.output_type) }}
                      </span>
                      <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
                        {{ estimatedMinutesLabel(quest.estimated_sec) }} {{ t("talks.minutes") }}
                      </span>
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
                    <span
                      v-if="isSelectedHeroQuest(quest.code)"
                      class="app-badge-success app-text-caption rounded-full px-2 py-1 font-semibold"
                    >
                      {{ t("training.quest_selected") }}
                    </span>
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
                    <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
                      {{ questCodeLabel(quest.code) }}
                    </span>
                    <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
                      {{ outputLabel(quest.output_type) }}
                    </span>
                    <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
                      {{ estimatedMinutesLabel(quest.estimated_sec) }} {{ t("talks.minutes") }}
                    </span>
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
                  <span
                    v-if="isSelectedHeroQuest(quest.code)"
                    class="app-badge-success app-text-caption rounded-full px-2 py-1 font-semibold"
                  >
                    {{ t("training.quest_selected") }}
                  </span>
                  <span class="app-subtle app-text-meta font-semibold">{{ quest.category }}</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>

    <div class="app-panel xl:sticky xl:top-4">
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
              <span class="app-badge-neutral app-text-caption rounded-full px-2 py-1 font-semibold">
                {{ trainingProgress.weekly_completed }} / {{ trainingProgress.weekly_target }}
              </span>
            </div>
            <div class="mt-3 overflow-x-auto pb-1">
              <div class="flex min-w-[440px] items-start gap-2 pr-1">
                <template v-for="(node, index) in questMapNodes" :key="node.id">
                  <div class="flex items-start gap-2">
                    <button
                      class="app-focus-ring flex w-[76px] flex-col items-center text-center transition"
                      :style="{ marginTop: `${node.offsetPx}px` }"
                      type="button"
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
                      <div class="app-badge-neutral app-text-caption mt-1 rounded-full px-2 py-0.5 font-semibold">
                        {{ node.category ?? t("training.quest_map_any_category") }}
                      </div>
                    </button>
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
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="app-text-eyebrow">
          {{ t("training.history_title") }}
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            class="app-focus-ring app-button-sm inline-flex items-center transition"
            :class="trainingActivityTab === 'feedback' ? 'app-button-secondary' : 'app-button-ghost'"
            type="button"
            @click="trainingActivityTab = 'feedback'"
          >
            {{ t("training.feedback_title") }} · {{ feedbackAttempts.length }}
          </button>
          <button
            class="app-focus-ring app-button-sm inline-flex items-center transition"
            :class="trainingActivityTab === 'history' ? 'app-button-secondary' : 'app-button-ghost'"
            type="button"
            @click="trainingActivityTab = 'history'"
          >
            {{ t("training.history_title") }} · {{ recentAttempts.length }}
          </button>
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
                <span class="app-badge-success app-text-caption rounded-full px-2 py-1 font-semibold">
                  {{ t("training.feedback_ready") }}
                </span>
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
    </div>
    </div>
  </section>
</template>
