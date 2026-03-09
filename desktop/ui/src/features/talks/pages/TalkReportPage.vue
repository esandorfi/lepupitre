<script setup lang="ts">
import { reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
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

/**
 * Page composition root (report step).
 * Reads: summary/timeline/runs projections from `useTalkReportPageState`.
 * Actions: export pack, reveal export path, and set-active command delegation.
 * Boundary: side-effect and race policies live in report runtime, not in template/page code.
 */
const { t } = useI18n();
const vm = reactive(useTalkReportPageState());
</script>

<template>
  <TalkStepPageShell
    :project-id="vm.projectId"
    :active="vm.activeStep"
    :eyebrow="t('talk_report.title')"
    :title="vm.project?.title || t('talk_report.unknown')"
    :subtitle="t('talk_report.subtitle')"
  >
    <template #meta>
      <span v-if="vm.talkNumber">T{{ vm.talkNumber }}</span>
      <span v-if="vm.project">
        {{ t("talk_report.duration") }}:
        {{ vm.project.duration_target_sec ? Math.round(vm.project.duration_target_sec / 60) : "--" }}
        {{ t("talk_report.minutes") }}
      </span>
      <RouterLink class="app-link underline" :to="talksRoute()">{{ t("talk_report.back") }}</RouterLink>
      <RouterLink class="app-link underline" :to="talkBuilderRoute(vm.projectId)">
        {{ t("talk_report.builder") }}
      </RouterLink>
      <RouterLink class="app-link underline" :to="talkBossRunRoute()">
        {{ t("talk_report.boss_run") }}
      </RouterLink>
      <RouterLink class="app-link underline" :to="talkExportRoute(vm.projectId)">
        {{ t("talk_report.packs") }}
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

    <TalkQuestLibraryPanel
      :project-id="vm.projectId"
      :entries="vm.report"
      :quest-code-label="vm.questCodeLabel"
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

    <TalkTimelinePanel :items="vm.timeline" />
  </TalkStepPageShell>
</template>
