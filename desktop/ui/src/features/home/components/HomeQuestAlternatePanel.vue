<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import type { Quest } from "@/schemas/ipc";
import HomeQuestPickerPanel from "./HomeQuestPickerPanel.vue";

const props = defineProps<{
  trainingProjectId: string | null;
  isQuestPickerOpen: boolean;
  isQuestPickerLoading: boolean;
  questPickerError: string | null;
  questPickerSearch: string;
  questPickerCategory: string;
  questPickerSort: "recent" | "az" | "category";
  questCategories: string[];
  hasFilteredQuests: boolean;
  showRecentQuestSection: boolean;
  recentPickerQuests: Quest[];
  pickerMainQuests: Quest[];
  selectedHeroQuestCode: string | null;
  questPickerActiveCode: string | null;
  questCodeLabel: (code: string) => string;
  outputLabel: (outputType: string) => string;
  estimatedMinutesLabel: (seconds: number) => number;
}>();

const emit = defineEmits<{
  (event: "openQuestPicker"): void;
  (event: "update:search", value: string): void;
  (event: "update:category", value: string): void;
  (event: "update:sort", value: "recent" | "az" | "category"): void;
  (event: "close"): void;
  (event: "selectQuest", quest: Quest): void;
  (event: "keydown", value: KeyboardEvent): void;
}>();

const { t } = useI18n();
</script>

<template>
  <UCard class="app-panel" variant="outline">
    <div class="app-text-eyebrow">{{ t("training.alternate_title") }}</div>
    <p class="app-muted app-text-body mt-2">{{ t("training.alternate_subtitle") }}</p>
    <div class="mt-3 flex flex-wrap gap-2">
      <UButton
        v-if="props.trainingProjectId"
        size="lg"
        :to="`/quest/FREE?projectId=${props.trainingProjectId}&from=training`"
        color="neutral"
        variant="outline"
      >
        {{ t("training.free_quest") }}
      </UButton>
      <UButton
        v-if="props.trainingProjectId"
        size="lg"
        color="neutral"
        variant="outline"
        @click="emit('openQuestPicker')"
      >
        {{ t("training.change_quest") }}
      </UButton>
      <RouterLink
        class="app-link app-text-meta inline-flex items-center underline"
        to="/talks"
      >
        {{ t("training.go_talks") }}
      </RouterLink>
    </div>

    <HomeQuestPickerPanel
      :open="props.isQuestPickerOpen"
      :is-loading="props.isQuestPickerLoading"
      :error="props.questPickerError"
      :search="props.questPickerSearch"
      :category="props.questPickerCategory"
      :sort="props.questPickerSort"
      :categories="props.questCategories"
      :has-filtered-quests="props.hasFilteredQuests"
      :show-recent-section="props.showRecentQuestSection"
      :recent-quests="props.recentPickerQuests"
      :main-quests="props.pickerMainQuests"
      :selected-quest-code="props.selectedHeroQuestCode"
      :active-quest-code="props.questPickerActiveCode"
      :project-id="props.trainingProjectId"
      :quest-code-label="props.questCodeLabel"
      :output-label="props.outputLabel"
      :estimated-minutes-label="props.estimatedMinutesLabel"
      @update:search="emit('update:search', $event)"
      @update:category="emit('update:category', $event)"
      @update:sort="emit('update:sort', $event)"
      @close="emit('close')"
      @select-quest="emit('selectQuest', $event)"
      @keydown="emit('keydown', $event)"
    />
  </UCard>
</template>
