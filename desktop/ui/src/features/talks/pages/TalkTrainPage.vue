<script setup lang="ts">
import { RouterLink } from "vue-router";
import TalkStepPageShell from "@/components/TalkStepPageShell.vue";
import { useTalkTrainPageState } from "@/features/talks/composables/useTalkTrainPageState";

const {
  t,
  projectId,
  error,
  isLoading,
  report,
  isActivating,
  project,
  isActive,
  talkNumber,
  summary,
  timeline,
  formatDate,
  attemptStatus,
  outputLabel,
  questCodeLabel,
  setActive,
  markTrainStage,
} = useTalkTrainPageState();
</script>

<template>
  <TalkStepPageShell
    :project-id="projectId"
    active="train"
    :eyebrow="t('talk_steps.train')"
    :title="project?.title || t('talk_report.unknown')"
  >
    <template #meta>
      <span v-if="talkNumber">T{{ talkNumber }}</span>
      <span v-if="project">
        {{ t("talk_report.duration") }}:
        {{ project.duration_target_sec ? Math.round(project.duration_target_sec / 60) : "--" }}
        {{ t("talk_report.minutes") }}
      </span>
      <RouterLink class="app-link underline" to="/talks">{{ t("talk_report.back") }}</RouterLink>
      <RouterLink class="app-link underline" :to="`/talks/${projectId}/builder`">
        {{ t("talk_report.builder") }}
      </RouterLink>
      <RouterLink class="app-link underline" :to="`/talks/${projectId}/export`">
        {{ t("talk_steps.export") }}
      </RouterLink>
    </template>
    <template #actions>
      <span
        v-if="isActive"
        class="app-pill app-pill-active app-text-meta inline-flex items-center rounded-full px-3 py-1 font-semibold"
      >
        {{ t("talk_report.active") }}
      </span>
      <UButton
        v-else
        size="sm"
        :disabled="isActivating"
        color="neutral"
        variant="outline"
        @click="setActive"
      >
        {{ t("talk_report.set_active") }}
      </UButton>
    </template>

    <UCard class="app-panel" variant="outline">
      <div v-if="isLoading" class="app-muted app-text-meta">{{ t("talk_report.loading") }}</div>
      <div v-else-if="error" class="app-danger-text app-text-meta">{{ error }}</div>
      <div v-else class="app-data-grid-4 app-text-meta">
        <UCard as="div" class="app-panel app-panel-compact" variant="outline">
          <div class="app-text-eyebrow">{{ t("talk_report.total") }}</div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.total }}</div>
        </UCard>
        <UCard as="div" class="app-panel app-panel-compact" variant="outline">
          <div class="app-text-eyebrow">{{ t("talk_report.started") }}</div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.started }}</div>
        </UCard>
        <UCard as="div" class="app-panel app-panel-compact" variant="outline">
          <div class="app-text-eyebrow">{{ t("talk_report.feedback") }}</div>
          <div class="app-text mt-1 text-lg font-semibold">{{ summary.feedbackCount }}</div>
        </UCard>
        <UCard as="div" class="app-panel app-panel-compact" variant="outline">
          <div class="app-text-eyebrow">{{ t("talk_report.last_activity") }}</div>
          <div class="app-text mt-1 text-sm font-semibold">{{ formatDate(summary.last) }}</div>
        </UCard>
      </div>
    </UCard>

    <UCard class="app-panel" variant="outline">
      <div class="app-text-eyebrow">{{ t("talk_report.boss_run") }}</div>
      <p class="app-muted app-text-body mt-2">{{ t("boss_run.subtitle") }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UButton size="lg" to="/boss-run" color="neutral" variant="outline" @click="markTrainStage">
          {{ t("boss_run.title") }}
        </UButton>
        <UButton
          size="lg"
          :to="`/quest/FREE?from=talk&projectId=${projectId}`"
          color="neutral"
          variant="outline"
          @click="markTrainStage"
        >
          {{ t("home.prototype_action_free") }}
        </UButton>
      </div>
    </UCard>

    <UCard class="app-panel" variant="outline">
      <div class="app-text-eyebrow">{{ t("talk_report.quest_library") }}</div>
      <div v-if="report.length === 0" class="app-muted app-text-body mt-3">{{ t("talk_report.no_quests") }}</div>
      <div v-else class="mt-3 space-y-3">
        <UCard
          v-for="(quest, index) in report"
          :key="quest.quest_code"
          as="div"
          class="app-panel app-panel-compact app-radius-card"
          variant="outline"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="app-text-eyebrow">
                {{ t("talk_report.quest_label") }} {{ index + 1 }} - {{ questCodeLabel(quest.quest_code) }}
              </div>
              <div class="app-text mt-1 text-sm font-semibold">{{ quest.quest_title }}</div>
              <div class="app-muted mt-1 text-xs">{{ quest.quest_prompt }}</div>
            </div>
            <div class="text-right text-xs">
              <div class="app-text">{{ outputLabel(quest.output_type) }}</div>
              <div class="app-muted mt-1">{{ attemptStatus(quest) }}</div>
              <div class="app-muted mt-1">{{ formatDate(quest.attempt_created_at) }}</div>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <UButton
              size="sm"
              :to="`/quest/${quest.quest_code}?from=talk&projectId=${projectId}`"
              color="info"
              @click="markTrainStage"
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

    <UCard class="app-panel" variant="outline">
      <div class="app-text-eyebrow">{{ t("talk_report.timeline") }}</div>
      <div v-if="timeline.length === 0" class="app-muted app-text-body mt-3">{{ t("talk_report.timeline_empty") }}</div>
      <div v-else class="mt-3 space-y-2 app-text-meta">
        <div
          v-for="item in timeline"
          :key="item.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
        >
          <div>
            <div class="app-text text-sm">{{ item.label }}</div>
            <div class="app-muted app-text-meta">
              {{ formatDate(item.date) }} - {{ item.status }}
              <span v-if="item.meta">- {{ item.meta }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <RouterLink v-if="item.to" class="app-link text-xs underline" :to="item.to">
              {{ t("talk_report.view_item") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </UCard>
  </TalkStepPageShell>
</template>
