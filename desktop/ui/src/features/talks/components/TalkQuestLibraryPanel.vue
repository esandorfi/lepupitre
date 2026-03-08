<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import type { QuestReportItem } from "@/schemas/ipc";
import { talkQuestRoute } from "@/features/talks/composables/shared/talkRoutes";
import {
  attemptStatus,
  formatDate,
  outputLabel,
} from "@/features/talks/composables/reportPage/talkReportPageHelpers";

const { t } = useI18n();

const props = defineProps<{
  projectId: string;
  entries: QuestReportItem[];
  questCodeLabel: (questCode: string) => string;
}>();

const emit = defineEmits<{
  openQuest: [questCode: string];
}>();

function openQuest(questCode: string) {
  emit("openQuest", questCode);
}
</script>

<template>
  <UCard class="app-panel" variant="outline">
    <div class="app-text-eyebrow">{{ t("talk_report.quest_library") }}</div>
    <div v-if="entries.length === 0" class="app-muted app-text-body mt-3">
      {{ t("talk_report.no_quests") }}
    </div>
    <div v-else class="mt-3 space-y-3">
      <UCard
        v-for="(quest, index) in entries"
        :key="quest.quest_code"
        as="div"
        class="app-panel app-panel-compact app-radius-card"
        variant="outline"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="app-text-eyebrow">
              {{ t("talk_report.quest_label") }} {{ index + 1 }} -
              {{ props.questCodeLabel(quest.quest_code) }}
            </div>
            <div class="app-text mt-1 text-sm font-semibold">{{ quest.quest_title }}</div>
            <div class="app-muted mt-1 text-xs">{{ quest.quest_prompt }}</div>
          </div>
          <div class="text-right text-xs">
            <div class="app-text">{{ outputLabel(t, quest.output_type) }}</div>
            <div class="app-muted mt-1">{{ attemptStatus(t, quest) }}</div>
            <div class="app-muted mt-1">{{ formatDate(quest.attempt_created_at) }}</div>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UButton
            size="sm"
            :to="talkQuestRoute(projectId, quest.quest_code)"
            color="info"
            @click="openQuest(quest.quest_code)"
          >
            {{ t("talk_report.open_quest") }}
          </UButton>
          <RouterLink
            v-if="quest.feedback_id"
            class="app-link text-xs underline"
            :to="`/feedback/${quest.feedback_id}`"
          >
            {{ t("talk_report.view_feedback") }}
          </RouterLink>
        </div>
      </UCard>
    </div>
  </UCard>
</template>
