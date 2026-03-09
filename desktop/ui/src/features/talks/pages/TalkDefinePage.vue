<script setup lang="ts">
import { reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import TalkStepPageShell from "@/components/TalkStepPageShell.vue";
import TalkDefineEditorPanel from "@/features/talks/components/TalkDefineEditorPanel.vue";
import { talksRoute } from "@/features/talks/composables/shared/talkRoutes";
import { useTalkDefinePageState } from "@/features/talks/composables/definePage/useTalkDefinePageState";

/**
 * Page composition root (define step).
 * Reads: define VM state/draft/checklist from `useTalkDefinePageState`.
 * Actions: save, stage transition, and next-step navigation commands from the define runtime.
 * Boundary: this page owns layout and conditional rendering only.
 */
const { t } = useI18n();
const vm = reactive(useTalkDefinePageState());
</script>

<template>
  <TalkStepPageShell
    :project-id="vm.projectId"
    active="define"
    :eyebrow="t('talk_define.title')"
    :title="t('talk_define.title')"
    :subtitle="t('talk_define.subtitle')"
  >

    <UCard v-if="!vm.activeProfileId" class="app-panel app-panel-compact">
      <p class="app-body-muted">{{ t("talk.need_profile") }}</p>
      <RouterLink class="app-link-meta mt-3 inline-block underline" to="/profiles">
        {{ t("talk.goto_profiles") }}
      </RouterLink>
    </UCard>

    <UCard v-else-if="vm.isLoading" class="app-panel app-panel-compact">
      <p class="app-body-muted">{{ t("talks.loading") }}</p>
    </UCard>

    <UCard v-else-if="vm.error" class="app-panel app-panel-compact">
      <p class="app-danger-text app-text-body">{{ vm.error }}</p>
    </UCard>

    <UCard v-else-if="!vm.project" class="app-panel app-panel-compact">
      <p class="app-body-muted">{{ t("talk_define.missing") }}</p>
      <RouterLink class="app-link-meta mt-3 inline-block underline" :to="talksRoute()">
        {{ t("talk_report.back") }}
      </RouterLink>
    </UCard>

    <TalkDefineEditorPanel
      v-else
      :form="vm.form"
      :save-error="vm.saveError"
      :save-state="vm.saveState"
      :stage-options="vm.stageOptions"
      :project-stage="vm.projectStage"
      :define-checklist="vm.defineChecklist"
      :define-completed-count="vm.defineCompletedCount"
      :define-completion-percent="vm.defineCompletionPercent"
      :define-ready="vm.defineReady"
      :next-missing-define-item="vm.nextMissingDefineItem"
      :next-action="vm.nextAction"
      :project="vm.project"
      :on-save-define="vm.saveDefine"
      :on-set-stage="vm.setStage"
      :on-run-next-action="vm.runNextAction"
    />
  </TalkStepPageShell>
</template>
