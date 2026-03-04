<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import { useI18n } from "@/lib/i18n";
import type { Quest } from "@/schemas/ipc";
import HomeQuestPickerRow from "./HomeQuestPickerRow.vue";

type QuestPickerSort = "recent" | "az" | "category";

const props = defineProps<{
  open: boolean;
  isLoading: boolean;
  error: string | null;
  search: string;
  category: string;
  sort: QuestPickerSort;
  categories: string[];
  hasFilteredQuests: boolean;
  showRecentSection: boolean;
  recentQuests: Quest[];
  mainQuests: Quest[];
  selectedQuestCode: string | null;
  activeQuestCode: string | null;
  projectId: string | null;
  questCodeLabel: (code: string) => string;
  outputLabel: (outputType: string) => string;
  estimatedMinutesLabel: (seconds: number) => number;
}>();

const emit = defineEmits<{
  (event: "update:search", value: string): void;
  (event: "update:category", value: string): void;
  (event: "update:sort", value: QuestPickerSort): void;
  (event: "close"): void;
  (event: "selectQuest", quest: Quest): void;
  (event: "keydown", value: KeyboardEvent): void;
}>();

const { t } = useI18n();
const searchInputRef = ref<HTMLInputElement | null>(null);
const listRef = ref<HTMLElement | null>(null);

function closePicker() {
  emit("close");
}

function selectQuest(quest: Quest) {
  emit("selectQuest", quest);
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) {
      return;
    }
    await nextTick();
    searchInputRef.value?.focus();
  }
);

watch(
  () => props.activeQuestCode,
  async (code) => {
    if (!props.open || !code) {
      return;
    }
    await nextTick();
    const listEl = listRef.value;
    if (!listEl) {
      return;
    }
    const rows = Array.from(listEl.querySelectorAll<HTMLElement>("[data-quest-code]"));
    const activeEl = rows.find((row) => row.dataset.questCode === code);
    activeEl?.scrollIntoView({ block: "nearest" });
  }
);
</script>

<template>
  <div
    v-if="props.open"
    class="mt-4 rounded-xl border border-[var(--app-border)] p-3"
    @keydown="emit('keydown', $event)"
  >
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div class="app-text app-text-section-title">{{ t("training.quest_picker_title") }}</div>
      <AppButton size="md" tone="ghost" @click="closePicker">
        {{ t("training.close_picker") }}
      </AppButton>
    </div>

    <div class="space-y-3">
      <UInput
        ref="searchInputRef"
        :model-value="props.search"
        class="w-full"
        :placeholder="t('training.quest_search_placeholder')"
        @update:model-value="emit('update:search', String($event ?? ''))"
      />

      <div class="flex flex-wrap gap-2">
        <AppButton
          v-for="option in props.categories"
          :key="option"
          size="sm"
          :tone="props.category === option ? 'secondary' : 'ghost'"
          @click="emit('update:category', option)"
        >
          {{ option === "all" ? t("training.quest_category_all") : option }}
        </AppButton>
      </div>

      <div class="flex flex-wrap gap-2">
        <AppButton
          size="sm"
          :tone="props.sort === 'recent' ? 'secondary' : 'ghost'"
          @click="emit('update:sort', 'recent')"
        >
          {{ t("training.quest_sort_recent") }}
        </AppButton>
        <AppButton
          size="sm"
          :tone="props.sort === 'az' ? 'secondary' : 'ghost'"
          @click="emit('update:sort', 'az')"
        >
          {{ t("training.quest_sort_az") }}
        </AppButton>
        <AppButton
          size="sm"
          :tone="props.sort === 'category' ? 'secondary' : 'ghost'"
          @click="emit('update:sort', 'category')"
        >
          {{ t("training.quest_sort_category") }}
        </AppButton>
      </div>

      <div v-if="props.isLoading" class="app-muted app-text-body">{{ t("talks.loading") }}</div>
      <div v-else-if="props.error" class="app-danger-text app-text-meta">{{ props.error }}</div>
      <div v-else-if="!props.hasFilteredQuests" class="app-muted app-text-body">
        {{ t("training.quest_picker_empty") }}
      </div>
      <div v-else ref="listRef" class="max-h-72 space-y-3 overflow-y-auto pr-1">
        <div v-if="props.showRecentSection" class="space-y-2">
          <p class="app-text-eyebrow">
            {{ t("training.quest_recent_title") }}
          </p>
          <HomeQuestPickerRow
            v-for="quest in props.recentQuests"
            :key="`recent-${quest.code}`"
            :quest="quest"
            :selected="props.selectedQuestCode === quest.code"
            :active="props.activeQuestCode === quest.code"
            :project-id="props.projectId"
            :quest-code-label="props.questCodeLabel"
            :output-label="props.outputLabel"
            :estimated-minutes-label="props.estimatedMinutesLabel"
            @close="closePicker"
            @select="selectQuest"
          />
        </div>

        <div v-if="props.mainQuests.length > 0" class="space-y-2">
          <p v-if="props.showRecentSection" class="app-text-eyebrow">
            {{ t("training.quest_all_title") }}
          </p>
          <HomeQuestPickerRow
            v-for="quest in props.mainQuests"
            :key="quest.code"
            :quest="quest"
            :selected="props.selectedQuestCode === quest.code"
            :active="props.activeQuestCode === quest.code"
            :project-id="props.projectId"
            :quest-code-label="props.questCodeLabel"
            :output-label="props.outputLabel"
            :estimated-minutes-label="props.estimatedMinutesLabel"
            @close="closePicker"
            @select="selectQuest"
          />
        </div>
      </div>
    </div>
  </div>
</template>
