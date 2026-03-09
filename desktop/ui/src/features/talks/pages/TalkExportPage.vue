<script setup lang="ts">
import { RouterLink } from "vue-router";
import TalkStepPageShell from "@/components/TalkStepPageShell.vue";
import TalkOutlineExportPanel from "@/features/talks/components/TalkOutlineExportPanel.vue";
import TalkPeerReviewsPanel from "@/features/talks/components/TalkPeerReviewsPanel.vue";
import TalkRunExportsPanel from "@/features/talks/components/TalkRunExportsPanel.vue";
import TalkSummaryPanel from "@/features/talks/components/TalkSummaryPanel.vue";
import {
  talkBuilderRoute,
  talkTrainRoute,
  talksRoute,
} from "@/features/talks/composables/shared/talkRoutes";
import { useTalkExportPageState } from "@/features/talks/composables/exportPage/useTalkExportPageState";

const {
  t,
  projectId,
  error,
  isLoading,
  isActivating,
  runs,
  peerReviews,
  exportPath,
  exportingRunId,
  isExportingOutline,
  isRevealing,
  exportError,
  project,
  isActive,
  talkNumber,
  summary,
  formatDate,
  exportPack,
  exportOutline,
  revealExport,
  setActive,
  markExportStage,
} = useTalkExportPageState();
</script>

<template>
  <TalkStepPageShell
    :project-id="projectId"
    active="export"
    :eyebrow="t('talk_steps.export')"
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
      <RouterLink class="app-link underline" :to="talkTrainRoute(projectId)">
        {{ t("talk_steps.train") }}
      </RouterLink>
      <RouterLink class="app-link underline" :to="talkBuilderRoute(projectId)">
        {{ t("talk_report.builder") }}
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

    <TalkOutlineExportPanel
      :project-id="projectId"
      :is-exporting="isExportingOutline"
      :on-export="exportOutline"
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

    <TalkPeerReviewsPanel
      :project-id="projectId"
      :peer-reviews="peerReviews"
      :on-open-packs="markExportStage"
    />
  </TalkStepPageShell>
</template>
