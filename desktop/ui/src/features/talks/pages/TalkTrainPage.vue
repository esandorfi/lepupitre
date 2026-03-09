<script setup lang="ts">
import { RouterLink } from "vue-router";
import TalkStepPageShell from "@/components/TalkStepPageShell.vue";
import TalkQuestLibraryPanel from "@/features/talks/components/TalkQuestLibraryPanel.vue";
import TalkSummaryPanel from "@/features/talks/components/TalkSummaryPanel.vue";
import TalkTimelinePanel from "@/features/talks/components/TalkTimelinePanel.vue";
import TalkTrainActionsPanel from "@/features/talks/components/TalkTrainActionsPanel.vue";
import {
  talkBuilderRoute,
  talkExportRoute,
  talksRoute,
} from "@/features/talks/composables/shared/talkRoutes";
import { useTalkTrainPageState } from "@/features/talks/composables/trainPage/useTalkTrainPageState";

/**
 * Page composition root (train step).
 * Reads: project/report/timeline projections from `useTalkTrainPageState`.
 * Actions: activate project and mark-train-stage commands from train runtime.
 * Boundary: page wires cards and navigation metadata only.
 */
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
      <RouterLink class="app-link underline" :to="talksRoute()">{{ t("talk_report.back") }}</RouterLink>
      <RouterLink class="app-link underline" :to="talkBuilderRoute(projectId)">
        {{ t("talk_report.builder") }}
      </RouterLink>
      <RouterLink class="app-link underline" :to="talkExportRoute(projectId)">
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
        @click="setActive"
      >
        {{ t("talk_report.set_active") }}
      </UButton>
    </template>

    <TalkSummaryPanel
      :is-loading="isLoading"
      :error="error"
      :summary="summary"
      :last-activity="formatDate(summary.last)"
    />

    <TalkTrainActionsPanel
      :project-id="projectId"
      :on-navigate="markTrainStage"
    />

    <TalkQuestLibraryPanel
      :project-id="projectId"
      :entries="report"
      :quest-code-label="questCodeLabel"
      @open-quest="markTrainStage"
    />

    <TalkTimelinePanel :items="timeline" />
  </TalkStepPageShell>
</template>
