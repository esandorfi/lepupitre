<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { QuestDaily } from "../schemas/ipc";
import type { QuestAttemptSummary } from "../schemas/ipc";

const { t } = useI18n();
const state = computed(() => appStore.state);
const trainingProjectId = ref<string | null>(null);
const trainingDailyQuest = ref<QuestDaily | null>(null);
const recentAttempts = ref<QuestAttemptSummary[]>([]);
const trainingError = ref<string | null>(null);
const isTrainingLoading = ref(false);
const feedbackAttempts = computed(() => recentAttempts.value.filter((attempt) => Boolean(attempt.feedback_id)));

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
  return outputType.toLowerCase() === "audio" ? t("quest.output_audio") : t("quest.output_text");
}

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function loadTrainingData() {
  if (!state.value.activeProfileId) {
    trainingProjectId.value = null;
    trainingDailyQuest.value = null;
    recentAttempts.value = [];
    return;
  }
  isTrainingLoading.value = true;
  trainingError.value = null;
  try {
    const projectId = await appStore.ensureTrainingProject();
    trainingProjectId.value = projectId;
    trainingDailyQuest.value = await appStore.getDailyQuestForProject(projectId);
    recentAttempts.value = await appStore.getQuestAttempts(projectId, 6);
  } catch (err) {
    trainingError.value = toError(err);
    trainingDailyQuest.value = null;
    recentAttempts.value = [];
  } finally {
    isTrainingLoading.value = false;
  }
}

onMounted(async () => {
  await appStore.bootstrap();
  await loadTrainingData();
});

watch(
  () => state.value.activeProfileId,
  async () => {
    await loadTrainingData();
  }
);
</script>

<template>
  <section class="space-y-6">
    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("training.hero_label") }}</div>
      <div v-if="trainingError" class="app-danger-text mt-2 text-xs">{{ trainingError }}</div>
      <div v-else-if="isTrainingLoading" class="app-muted mt-2 text-sm">{{ t("talks.loading") }}</div>
      <div v-else-if="trainingDailyQuest" class="mt-2 space-y-2">
        <div class="app-text text-base font-semibold">{{ trainingDailyQuest.quest.title }}</div>
        <div class="app-muted text-sm">{{ trainingDailyQuest.quest.prompt }}</div>
        <div class="flex flex-wrap items-center gap-2 text-[11px]">
          <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
            {{ outputLabel(trainingDailyQuest.quest.output_type) }}
          </span>
          <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
            {{ trainingDailyQuest.quest.category }}
          </span>
          <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
            {{ estimatedMinutesLabel(trainingDailyQuest.quest.estimated_sec) }} {{ t("talks.minutes") }}
          </span>
        </div>
        <div class="pt-1">
          <RouterLink
            class="app-button-primary app-focus-ring inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold"
            :to="`/quest/${trainingDailyQuest.quest.code}?projectId=${trainingProjectId}&from=training`"
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
        <RouterLink
          class="app-link inline-flex min-h-11 items-center text-xs underline"
          to="/talks"
        >
          {{ t("training.go_talks") }}
        </RouterLink>
      </div>
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("training.feedback_title") }}
      </div>
      <div v-if="isTrainingLoading" class="app-muted mt-2 text-sm">{{ t("talks.loading") }}</div>
      <div v-else-if="feedbackAttempts.length === 0" class="app-muted mt-2 text-sm">
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
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("training.history_title") }}
      </div>
      <div v-if="isTrainingLoading" class="app-muted mt-2 text-sm">{{ t("talks.loading") }}</div>
      <div v-else-if="recentAttempts.length === 0" class="app-muted mt-2 text-sm">
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
    </div>
  </section>
</template>
