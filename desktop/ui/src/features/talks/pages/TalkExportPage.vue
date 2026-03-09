<script setup lang="ts">
import { reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
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

/**
 * Page composition root (export step).
 * Reads: export/report/review projections from `useTalkExportPageState`.
 * Actions: export pack/outline, reveal export path, and mark-export-stage command delegation.
 * Boundary: this page coordinates sections; runtime handles async and failure behavior.
 */
const { t } = useI18n();
const vm = reactive(useTalkExportPageState());
</script>

<template>
  <TalkStepPageShell
    :project-id="vm.projectId"
    active="export"
    :eyebrow="t('talk_steps.export')"
    :title="vm.project?.title || t('talk_report.unknown')"
  >
    <template #meta>
      <span v-if="vm.talkNumber">T{{ vm.talkNumber }}</span>
      <span v-if="vm.project">
        {{ t("talk_report.duration") }}:
        {{ vm.project.duration_target_sec ? Math.round(vm.project.duration_target_sec / 60) : "--" }}
        {{ t("talk_report.minutes") }}
      </span>
      <RouterLink class="app-link underline" :to="talksRoute()">{{ t("talk_report.back") }}</RouterLink>
      <RouterLink class="app-link underline" :to="talkTrainRoute(vm.projectId)">
        {{ t("talk_steps.train") }}
      </RouterLink>
      <RouterLink class="app-link underline" :to="talkBuilderRoute(vm.projectId)">
        {{ t("talk_report.builder") }}
      </RouterLink>
    </template>
    <template #actions>
      <span
        v-if="vm.isActive"
        class="app-pill app-pill-active app-text-meta inline-flex items-center rounded-full px-3 py-1 font-semibold"
      >
        {{ t("talk_report.active") }}
      </span>
      <UButton
        v-else
        size="sm"
        :disabled="vm.isActivating"
        @click="vm.setActive"
      >
        {{ t("talk_report.set_active") }}
      </UButton>
    </template>

    <TalkSummaryPanel
      :is-loading="vm.isLoading"
      :error="vm.error"
      :summary="vm.summary"
      :last-activity="vm.formatDate(vm.summary.last)"
    />

    <TalkOutlineExportPanel
      :project-id="vm.projectId"
      :is-exporting="vm.isExportingOutline"
      :on-export="vm.exportOutline"
    />

    <TalkRunExportsPanel
      :runs="vm.runs"
      :exporting-run-id="vm.exportingRunId"
      :export-path="vm.exportPath"
      :is-revealing="vm.isRevealing"
      :export-error="vm.exportError"
      :on-export-pack="vm.exportPack"
      :on-reveal-export="vm.revealExport"
    />

    <TalkPeerReviewsPanel
      :project-id="vm.projectId"
      :peer-reviews="vm.peerReviews"
      :on-open-packs="vm.markExportStage"
    />
  </TalkStepPageShell>
</template>
