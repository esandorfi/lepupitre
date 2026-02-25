<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { Quest, QuestAttemptSummary, QuestDaily } from "../schemas/ipc";

const { t } = useI18n();
const state = computed(() => appStore.state);
const trainingProjectId = ref<string | null>(null);
const trainingDailyQuest = ref<QuestDaily | null>(null);
const selectedHeroQuest = ref<Quest | null>(null);
const recentAttempts = ref<QuestAttemptSummary[]>([]);
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
    recentAttempts.value = await appStore.getQuestAttempts(projectId, 6);
  } catch (err) {
    trainingError.value = toError(err);
    trainingDailyQuest.value = null;
    recentAttempts.value = [];
  } finally {
    isTrainingLoading.value = false;
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
</script>

<template>
  <section class="space-y-6">
    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("training.hero_label") }}</div>
      <div v-if="trainingError" class="app-danger-text mt-2 text-xs">{{ trainingError }}</div>
      <div v-else-if="isTrainingLoading" class="app-muted mt-2 text-sm">{{ t("talks.loading") }}</div>
      <div v-else-if="heroQuest" class="mt-2 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="app-badge-neutral rounded-full px-2 py-1 text-[10px] font-semibold">
            {{ heroQuestIsOverride ? t("training.hero_selected_badge") : t("training.hero_daily_badge") }}
          </span>
          <button
            v-if="heroQuestIsOverride && trainingDailyQuest"
            class="app-link text-xs underline"
            type="button"
            @click="resetHeroQuestToDaily"
          >
            {{ t("training.use_daily_quest") }}
          </button>
        </div>
        <div class="app-text text-base font-semibold">{{ heroQuest.title }}</div>
        <div class="app-muted text-sm">{{ heroQuest.prompt }}</div>
        <div class="flex flex-wrap items-center gap-2 text-[11px]">
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
            class="app-button-primary app-focus-ring inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold"
            :to="questRoute(heroQuest.code)"
          >
            {{ t("training.start") }}
          </RouterLink>
        </div>
      </div>
      <div v-else class="app-muted mt-2 text-sm">
        {{ t("home.quest_empty") }}
      </div>
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("training.alternate_title") }}</div>
      <p class="app-muted mt-2 text-sm">{{ t("training.alternate_subtitle") }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <RouterLink
          v-if="trainingProjectId"
          class="app-button-secondary app-focus-ring inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold"
          :to="`/quest/FREE?projectId=${trainingProjectId}&from=training`"
        >
          {{ t("training.free_quest") }}
        </RouterLink>
        <button
          v-if="trainingProjectId"
          class="app-button-secondary app-focus-ring inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold"
          type="button"
          @click="openQuestPicker"
        >
          {{ t("training.change_quest") }}
        </button>
        <RouterLink
          class="app-link inline-flex min-h-11 items-center text-xs underline"
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
          <div class="app-text text-sm font-semibold">{{ t("training.quest_picker_title") }}</div>
          <button
            class="app-button-ghost app-focus-ring inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold"
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
            class="app-input app-focus-ring h-10 w-full rounded-xl border px-3 text-sm"
            type="text"
            :placeholder="t('training.quest_search_placeholder')"
          />

          <div class="flex flex-wrap gap-2">
            <button
              v-for="category in questCategories"
              :key="category"
              class="app-focus-ring rounded-full px-3 py-1.5 text-xs font-semibold transition"
              :class="questPickerCategory === category ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="questPickerCategory = category"
            >
              {{ category === "all" ? t("training.quest_category_all") : category }}
            </button>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              class="app-focus-ring rounded-full px-3 py-1.5 text-xs font-semibold transition"
              :class="questPickerSort === 'recent' ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="questPickerSort = 'recent'"
            >
              {{ t("training.quest_sort_recent") }}
            </button>
            <button
              class="app-focus-ring rounded-full px-3 py-1.5 text-xs font-semibold transition"
              :class="questPickerSort === 'az' ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="questPickerSort = 'az'"
            >
              {{ t("training.quest_sort_az") }}
            </button>
            <button
              class="app-focus-ring rounded-full px-3 py-1.5 text-xs font-semibold transition"
              :class="questPickerSort === 'category' ? 'app-button-secondary' : 'app-button-ghost'"
              type="button"
              @click="questPickerSort = 'category'"
            >
              {{ t("training.quest_sort_category") }}
            </button>
          </div>

          <div v-if="isQuestPickerLoading" class="app-muted text-sm">{{ t("talks.loading") }}</div>
          <div v-else-if="questPickerError" class="app-danger-text text-xs">{{ questPickerError }}</div>
          <div v-else-if="filteredQuests.length === 0" class="app-muted text-sm">
            {{ t("training.quest_picker_empty") }}
          </div>
          <div v-else ref="questPickerListEl" class="max-h-72 space-y-3 overflow-y-auto pr-1">
            <div v-if="showRecentQuestSection" class="space-y-2">
              <p class="app-subtle text-[11px] font-semibold uppercase tracking-[0.16em]">
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
                    <div class="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
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
                      class="app-link text-xs underline"
                      :to="questRoute(quest.code)"
                      @click.stop="closeQuestPicker"
                    >
                      {{ t("training.quest_start_now") }}
                    </RouterLink>
                    <span
                      v-if="isSelectedHeroQuest(quest.code)"
                      class="app-badge-success rounded-full px-2 py-1 text-[10px] font-semibold"
                    >
                      {{ t("training.quest_selected") }}
                    </span>
                    <span class="app-subtle text-[11px] font-semibold">{{ quest.category }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="pickerMainQuests.length > 0" class="space-y-2">
              <p
                v-if="showRecentQuestSection"
                class="app-subtle text-[11px] font-semibold uppercase tracking-[0.16em]"
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
                  <div class="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
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
                    class="app-link text-xs underline"
                    :to="questRoute(quest.code)"
                    @click.stop="closeQuestPicker"
                  >
                    {{ t("training.quest_start_now") }}
                  </RouterLink>
                  <span
                    v-if="isSelectedHeroQuest(quest.code)"
                    class="app-badge-success rounded-full px-2 py-1 text-[10px] font-semibold"
                  >
                    {{ t("training.quest_selected") }}
                  </span>
                  <span class="app-subtle text-[11px] font-semibold">{{ quest.category }}</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("training.history_title") }}
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            class="app-focus-ring rounded-full px-3 py-1.5 text-xs font-semibold transition"
            :class="trainingActivityTab === 'feedback' ? 'app-button-secondary' : 'app-button-ghost'"
            type="button"
            @click="trainingActivityTab = 'feedback'"
          >
            {{ t("training.feedback_title") }} · {{ feedbackAttempts.length }}
          </button>
          <button
            class="app-focus-ring rounded-full px-3 py-1.5 text-xs font-semibold transition"
            :class="trainingActivityTab === 'history' ? 'app-button-secondary' : 'app-button-ghost'"
            type="button"
            @click="trainingActivityTab = 'history'"
          >
            {{ t("training.history_title") }} · {{ recentAttempts.length }}
          </button>
        </div>
      </div>

      <div v-if="isTrainingLoading" class="app-muted mt-3 text-sm">{{ t("talks.loading") }}</div>

      <template v-else-if="trainingActivityTab === 'feedback'">
        <div v-if="feedbackAttempts.length === 0" class="app-muted mt-3 text-sm">
          {{ t("training.feedback_empty") }}
        </div>
        <div v-else class="mt-3 space-y-3">
          <div class="space-y-2 text-xs">
            <div
              v-for="attempt in feedbackAttempts"
              :key="attempt.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
            >
              <div>
                <div class="app-text text-sm">{{ attempt.quest_title }}</div>
                <div class="app-muted text-[11px]">
                  {{ formatDate(attempt.created_at) }} · {{ outputLabel(attempt.output_type) }} ·
                  {{ questCodeLabel(attempt.quest_code) }}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="app-badge-success rounded-full px-2 py-1 text-[10px] font-semibold">
                  {{ t("training.feedback_ready") }}
                </span>
                <RouterLink
                  v-if="attempt.feedback_id"
                  class="app-link text-xs underline"
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
        <div v-if="recentAttempts.length === 0" class="app-muted mt-3 text-sm">
          {{ t("training.history_empty") }}
        </div>
        <div v-else class="mt-3 space-y-2 text-xs">
          <div
            v-for="attempt in recentAttempts"
            :key="attempt.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
          >
            <div>
              <div class="app-text text-sm">{{ attempt.quest_title }}</div>
              <div class="app-muted text-[11px]">
                {{ formatDate(attempt.created_at) }} · {{ attemptStatus(attempt) }} ·
                {{ questCodeLabel(attempt.quest_code) }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <RouterLink
                class="app-link text-xs underline"
                :to="`/quest/${attempt.quest_code}?projectId=${trainingProjectId}&from=training`"
              >
                {{ t("home.quest_followup_replay") }}
              </RouterLink>
              <RouterLink
                v-if="attempt.feedback_id"
                class="app-link text-xs underline"
                :to="`/feedback/${attempt.feedback_id}`"
              >
                {{ t("home.quest_followup_feedback") }}
              </RouterLink>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
