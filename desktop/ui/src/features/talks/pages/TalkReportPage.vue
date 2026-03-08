<script setup lang="ts">
import { RouterLink } from "vue-router";
import TalkStepPageShell from "@/components/TalkStepPageShell.vue";
import TalkQuestLibraryPanel from "@/features/talks/components/TalkQuestLibraryPanel.vue";
import TalkRunExportsPanel from "@/features/talks/components/TalkRunExportsPanel.vue";
import TalkSummaryPanel from "@/features/talks/components/TalkSummaryPanel.vue";
import TalkTimelinePanel from "@/features/talks/components/TalkTimelinePanel.vue";
import {
  talkBossRunRoute,
  talkBuilderRoute,
  talkExportRoute,
  talksRoute,
} from "@/features/talks/composables/shared/talkRoutes";
import { useTalkReportPageState } from "@/features/talks/composables/reportPage/useTalkReportPageState";

const {
  t,
  projectId,
  error,
  isLoading,
  report,
  runs,
  isActivating,
  exportPath,
  exportingRunId,
  isRevealing,
  exportError,
  project,
  isActive,
  talkNumber,
  activeStep,
  summary,
  timeline,
  formatDate,
  questCodeLabel,
  exportPack,
  revealExport,
  setActive,
} = useTalkReportPageState();
</script>

<template>
  <TalkStepPageShell
    :project-id="projectId"
    :active="activeStep"
    :eyebrow="t('talk_report.title')"
    :title="project?.title || t('talk_report.unknown')"
    :subtitle="t('talk_report.subtitle')"
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
      <RouterLink class="app-link underline" :to="talkBossRunRoute()">
        {{ t("talk_report.boss_run") }}
      </RouterLink>
      <RouterLink class="app-link underline" :to="talkExportRoute(projectId)">
        {{ t("talk_report.packs") }}
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

    <TalkSummaryPanel
      :is-loading="isLoading"
      :error="error"
      :summary="summary"
      :last-activity="formatDate(summary.last)"
    />

    <TalkQuestLibraryPanel
      :project-id="projectId"
      :entries="report"
      :quest-code-label="questCodeLabel"
    />

    <TalkRunExportsPanel
      :runs="runs"
      :exporting-run-id="exportingRunId"
      :export-path="exportPath"
      :is-revealing="isRevealing"
      :export-error="exportError"
      :on-export-pack="exportPack"
      :on-reveal-export="revealExport"
    />

    <TalkTimelinePanel :items="timeline" />
  </TalkStepPageShell>
</template>
