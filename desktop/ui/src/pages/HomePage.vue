<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { RouterLink } from "vue-router";
import SecurityProbe from "../components/SecurityProbe.vue";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { QuestAttemptSummary } from "../schemas/ipc";

const { t } = useI18n();
const state = computed(() => appStore.state);
const recentAttempts = computed(() => appStore.state.recentAttempts);
const activeProfileName = computed(() => {
  const activeId = appStore.state.activeProfileId;
  if (!activeId) {
    return null;
  }
  return appStore.state.profiles.find((profile) => profile.id === activeId)?.name ?? null;
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
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

onMounted(async () => {
  await appStore.bootstrap();
  await appStore.loadRecentAttempts();
});

watch(
  () => state.value.activeProject?.id,
  async () => {
    await appStore.loadRecentAttempts();
  }
);
</script>

<template>
  <section class="space-y-6">
    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("home.quest_title") }}
      </div>
      <div v-if="state.dailyQuest" class="mt-2 space-y-2">
        <div class="app-text text-sm">{{ state.dailyQuest.quest.title }}</div>
        <div class="app-muted text-xs">{{ state.dailyQuest.quest.prompt }}</div>
        <div class="app-subtle text-[11px] uppercase tracking-[0.2em]">
          {{ t("home.quest_recommended") }}
        </div>
        <RouterLink
          class="app-link mt-2 inline-block text-xs underline"
          :to="`/quest/${state.dailyQuest.quest.code}`"
        >
          {{ t("home.quest_action") }}
        </RouterLink>
      </div>
      <div v-else class="app-muted mt-2 text-sm">
        {{ t("home.quest_empty") }}
      </div>
      <div class="app-muted mt-3 text-sm font-semibold whitespace-pre-line">
        {{ t("home.subtitle") }}
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("home.talk_title") }}
        </div>
        <div class="app-text mt-2 text-sm">
          <span v-if="state.activeProject">{{ state.activeProject.title }}</span>
          <span v-else>{{ t("home.talk_empty") }}</span>
        </div>
        <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/talks">
          {{ t("home.talk_action") }}
        </RouterLink>
      </div>

      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("home.profile_title") }}
        </div>
        <div class="app-text mt-2 text-sm">
          <span v-if="state.activeProfileId">
            {{ t("home.profile_active") }}: {{ activeProfileName || state.activeProfileId }}
          </span>
          <span v-else>{{ t("home.profile_empty") }}</span>
        </div>
        <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
          {{ t("home.profile_action") }}
        </RouterLink>
      </div>
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("home.quest_followup_title") }}
      </div>
      <div v-if="recentAttempts.length === 0" class="app-muted mt-2 text-sm">
        {{ t("home.quest_followup_empty") }}
      </div>
      <div v-else class="mt-3 space-y-3">
        <RouterLink
          class="app-button-info inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold"
          :to="`/quest/${recentAttempts[0].quest_code}`"
        >
          {{ t("home.quest_followup_continue") }}
        </RouterLink>
        <div class="space-y-2 text-xs">
          <div
            v-for="attempt in recentAttempts"
            :key="attempt.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
          >
            <div>
              <div class="app-text text-sm">{{ attempt.quest_title }}</div>
              <div class="app-muted text-[11px]">
                {{ formatDate(attempt.created_at) }} · {{ attemptStatus(attempt) }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <RouterLink
                class="app-link text-xs underline"
                :to="`/quest/${attempt.quest_code}`"
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
    </div>

    <div class="app-surface rounded-2xl border p-4">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("home.prototype_title") }}
      </div>
      <p class="app-text mt-2 text-sm">{{ t("home.prototype_subtitle") }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <RouterLink
          v-if="state.dailyQuest && state.activeProject"
          class="app-button-info inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold"
          :to="`/quest/${state.dailyQuest.quest.code}`"
        >
          {{ t("home.prototype_action_daily") }}
        </RouterLink>
        <RouterLink
          v-if="state.activeProject"
          class="app-button-secondary inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold"
          to="/quest/FREE"
        >
          {{ t("home.prototype_action_free") }}
        </RouterLink>
        <RouterLink
          v-if="!state.activeProfileId"
          class="app-link inline-flex items-center text-xs underline"
          to="/profiles"
        >
          {{ t("home.prototype_need_profile") }}
        </RouterLink>
        <RouterLink
          v-else-if="!state.activeProject"
          class="app-link inline-flex items-center text-xs underline"
          to="/project/new"
        >
          {{ t("home.prototype_need_talk") }}
        </RouterLink>
      </div>
    </div>
    <SecurityProbe />
  </section>
</template>
