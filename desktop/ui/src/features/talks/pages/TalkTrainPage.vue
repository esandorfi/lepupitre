<script setup lang="ts">
import { reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
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
const { t } = useI18n();
const vm = reactive(useTalkTrainPageState());
</script>

<template>
  <TalkStepPageShell
    :project-id="vm.projectId"
    active="train"
    :eyebrow="t('talk_steps.train')"
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
      <RouterLink class="app-link underline" :to="talkBuilderRoute(vm.projectId)">
        {{ t("talk_report.builder") }}
      </RouterLink>
      <RouterLink class="app-link underline" :to="talkExportRoute(vm.projectId)">
        {{ t("talk_steps.export") }}
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

    <TalkTrainActionsPanel
      :project-id="vm.projectId"
      :on-navigate="vm.markTrainStage"
    />

    <TalkQuestLibraryPanel
      :project-id="vm.projectId"
      :entries="vm.report"
      :quest-code-label="vm.questCodeLabel"
      @open-quest="vm.markTrainStage"
    />

    <TalkTimelinePanel :items="vm.timeline" />
  </TalkStepPageShell>
</template>
